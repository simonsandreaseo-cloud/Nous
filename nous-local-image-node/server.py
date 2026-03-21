import asyncio
import json
import base64
import uuid
import torch
import websockets
import piexif
import os
import platform
import time
import collections
import urllib.request
import urllib.error
import requests
import re

print("[*] BUILD_MARKER_9999")
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import sys
import huggingface_hub.utils.tqdm as hf_tqdm
from tqdm.auto import tqdm as std_tqdm
from piexif import ImageIFD, ExifIFD
from io import BytesIO

# --- Globals and State ---
connected_clients = set()
ws_queue = collections.deque()
current_download_model = "model"
last_sent_progress = {}
last_sent_bytes = {}
last_full_progress_payload = None
is_initializing = False
image_pipeline = None
text_pipeline = None

# --- TQDM Monkey Patch and Logging Redirect ---
# (State moved to Globals section above)


# Custom stream to capture prints and send them over WS
class WSLogger:
    def __init__(self, original_stream):
        self.original_stream = original_stream
    
    def write(self, message):
        self.original_stream.write(message)
        if message.strip():
            # Avoid flooding with empty lines or progress bar raw text
            if "|" not in message: 
                 msg_data = {"type": "LOG", "payload": {"message": message.strip(), "level": "info"}}
                 ws_queue.append(msg_data)
    
    def flush(self):
        self.original_stream.flush()

# Redirect stdout to catch all print calls
sys.stdout = WSLogger(sys.stdout)

class WSTqdm(std_tqdm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Use description to distinguish bars
        self.bar_id = kwargs.get("desc") or "download"
        if hasattr(self, 'total') and self.total and self.total > 0:
            self._send_to_ws()
        
    def update(self, n=1):
        super().update(n)
        if hasattr(self, 'total') and self.total is not None and self.total > 0:
            progress = round((self.n / self.total) * 100, 1)
            # Use specific key for each bar description
            last_key = f"{current_download_model}:{self.bar_id}"
            bytes_since_last = self.n - last_sent_bytes.get(last_key, 0)
            
            if (last_sent_progress.get(last_key) != progress or 
                bytes_since_last > 2 * 1024 * 1024): # Update every 2MB or 0.1%
                self._send_to_ws(progress)

    def _send_to_ws(self, progress=None):
        if progress is None:
            progress = round((self.n / self.total) * 100, 1) if getattr(self, 'total', None) else 0
            
        last_key = f"{current_download_model}:{self.bar_id}"
        last_sent_progress[last_key] = progress
        last_sent_bytes[last_key] = self.n
        
        payload = {
            "model": current_download_model,
            "label": self.bar_id,
            "progress": progress,
            "downloaded": self.n,
            "total": self.total
        }
        global last_full_progress_payload
        # Only set as primary display if it's a large file or explicit download
        if self.total > 1024 * 1024:
            last_full_progress_payload = payload
            
        ws_queue.append({"type": "DOWNLOAD_PROGRESS", "payload": payload})

hf_tqdm.tqdm = WSTqdm
import tqdm
tqdm.tqdm = WSTqdm
import tqdm.auto
tqdm.auto.tqdm = WSTqdm

from diffusers import AutoPipelineForText2Image
from huggingface_hub import hf_hub_download
from llama_cpp import Llama


async def progress_broadcaster():
    """Background task to broadcast progress to all clients in parallel"""
    print("[*] Progress Broadcaster iniciado.")
    while True:
        if len(ws_queue) > 10:
            while len(ws_queue) > 1:
                ws_queue.popleft()
        
        while ws_queue:
            msg = ws_queue.popleft()
            if not connected_clients:
                continue
            
            # If msg is already a structured dict with 'type', use it. Otherwise wrap it as progress.
            if isinstance(msg, dict) and "type" in msg:
                 message = json.dumps(msg)
            else:
                 message = json.dumps({"type": "DOWNLOAD_PROGRESS", "payload": msg})
            
            tasks = [ws.send(message) for ws in list(connected_clients)]
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
                
        await asyncio.sleep(0.1)


# Configuración del servidor
HOST = "127.0.0.1"
PORT = 8181
AUTH_TOKEN = "nous-dev-token-2026"
IMAGE_MODEL_ID = "stabilityai/sdxl-turbo"
TEXT_MODEL_REPO = "bartowski/google_gemma-3-4b-it-GGUF"
TEXT_MODEL_FILE = "google_gemma-3-4b-it-Q4_K_M.gguf"

# Resolve permanent AppData path for models
APP_ID = "com.nous.clinical"
if platform.system() == "Windows":
    BASE_APP_DATA = os.getenv("APPDATA")
elif platform.system() == "Darwin":
    BASE_APP_DATA = os.path.expanduser("~/Library/Application Support")
else:
    BASE_APP_DATA = os.path.expanduser("~/.config")

PERSISTENT_MODEL_DIR = os.path.join(BASE_APP_DATA, APP_ID, "models")
os.makedirs(PERSISTENT_MODEL_DIR, exist_ok=True)

print("=========================================")
print("  NOUS LOCAL ENGINE - UNIFIED AI CORE")
print("=========================================")

# (Globals moved to top)


# (WSTqdm moved to top for earlier patching)


# (Internal logic below)

async def download_model_with_progress(repo_id, filename=None, websocket=None, label="model"):
    global current_download_model
    current_download_model = label
    
    print(f"[*] Checking/Downloading {label} using HuggingFace Hub...")
    
    if websocket:
        await websocket.send(json.dumps({
            "type": "DOWNLOAD_STATUS",
            "payload": { "model": label, "status": "downloading" }
        }))
        
    try:
        def do_download():
            # Use hf_hub_download which handles partial downloads, resume, and integrity checks
            return hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                cache_dir=PERSISTENT_MODEL_DIR,
                local_dir=PERSISTENT_MODEL_DIR,
                local_dir_use_symlinks=False
            )

        path = await asyncio.to_thread(do_download)
        print(f"[*] {label} ready at: {path}")
        
        if websocket:
            await websocket.send(json.dumps({
                "type": "DOWNLOAD_STATUS",
                "payload": { "model": label, "status": "complete", "path": path }
            }))
        return path
        
    except Exception as e:
        print(f"[!] Download Failed for {label}: {e}")
        if websocket:
            await websocket.send(json.dumps({
                "type": "DOWNLOAD_STATUS",
                "payload": { "model": label, "status": "error", "message": str(e) }
            }))
        return None

async def init_models(websocket=None):
    global image_pipeline, text_pipeline, is_initializing, current_download_model
    if is_initializing:
        print("[*] Models already initializing, notifying new client of current status.")
        if websocket:
            try:
                await websocket.send(json.dumps({
                    "type": "DOWNLOAD_STATUS",
                    "payload": { "model": current_download_model, "status": "downloading" }
                }))
                if last_full_progress_payload:
                    await websocket.send(json.dumps({
                        "type": "DOWNLOAD_PROGRESS",
                        "payload": last_full_progress_payload
                    }))
            except: pass
        return
    
    is_initializing = True
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[*] Initializing Unified Engine on: {device}")
        
        # 1. Load Text Model (Gemma 3)
        if not text_pipeline:
            path = await download_model_with_progress(TEXT_MODEL_REPO, TEXT_MODEL_FILE, websocket, "Gemma-3-4B")
            if path:
                print("[*] Loading Llama.cpp for Gemma 3...")
                text_pipeline = await asyncio.to_thread(
                    Llama,
                    model_path=path,
                    n_gpu_layers=-1 if device == "cuda" else 0,
                    n_ctx=2048,
                    verbose=False
                )
                print("[*] Text Engine Ready!")
                if websocket:
                    await websocket.send(json.dumps({"type": "ENGINE_READY", "payload": {"engine": "text"}}))

        # 2. Load Image Model (SDXL Turbo)
        if not image_pipeline:     
            current_download_model = "SDXL-Turbo"
            if websocket:
                await websocket.send(json.dumps({
                    "type": "DOWNLOAD_STATUS",
                    "payload": { "model": "SDXL-Turbo", "status": "downloading" }
                }))
                
            print("[*] Loading SDXL Turbo pipeline...")
            image_pipeline = await asyncio.to_thread(
                AutoPipelineForText2Image.from_pretrained,
                IMAGE_MODEL_ID, 
                torch_dtype=torch.float16 if device == "cuda" else torch.float32, 
                variant="fp16" if device == "cuda" else None,
                use_safetensors=True,
                cache_dir=PERSISTENT_MODEL_DIR,
                low_cpu_mem_usage=True
            )

            image_pipeline.to(device)
            print("[*] Image Engine Ready for blazing fast generations.")
            if websocket:
                await websocket.send(json.dumps({
                    "type": "DOWNLOAD_STATUS",
                    "payload": { "model": "SDXL-Turbo", "status": "complete" }
                }))
                await websocket.send(json.dumps({"type": "ENGINE_READY", "payload": {"engine": "image"}}))
    except Exception as e:
        print(f"[!] Engine Error: {e}")
        if websocket:
            try:
                await websocket.send(json.dumps({
                    "type": "DOWNLOAD_STATUS",
                    "payload": { "model": "SDXL-Turbo", "status": "error", "message": str(e) }
                }))
            except: pass
    finally:
        is_initializing = False

def generate_text_sync(prompt, system=""):
    global text_pipeline
    if not text_pipeline:
        raise Exception("Text Engine Offline")
        
    messages = []
    if system: messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    res = text_pipeline.create_chat_completion(
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
        stream=False
    )
    return res["choices"][0]["message"]["content"]

def generate_image_base64_sync(prompt: str, seed=None) -> str:
    global image_pipeline
    if not image_pipeline:
        raise Exception("Image Engine Offline")
        
    print(f"[*] Generating: '{prompt}'...")
    generator = None
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if seed is not None:
        generator = torch.Generator(device=device).manual_seed(seed)
    else:
        generator = torch.Generator(device=device).manual_seed(int(time.time()))
        
    image = image_pipeline(
        prompt=prompt, 
        num_inference_steps=2,
        guidance_scale=0.0,
        generator=generator
    ).images[0]
    
    # EXIF SEO Injection
    exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
    user_comment = piexif.helper.UserComment.dump(prompt or "Nous Local Image Node", encoding="unicode")
    exif_dict["Exif"][piexif.ExifIFD.UserComment] = user_comment
    exif_dict["0th"][piexif.ImageIFD.ImageDescription] = prompt.encode("utf-8") if prompt else b"Nous Local Image Node"
    exif_bytes = piexif.dump(exif_dict)
    
    buffered = BytesIO()
    image.save(buffered, format="WebP", lossless=False, quality=90, exif=exif_bytes)
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    print("[*] WebP Generation complete!")
    return f"data:image/webp;base64,{img_str}"

# --- Scraping Handlers ---

def perform_serp_scraping(keyword):
    """Simple SERP scraper using requests and regex"""
    print(f"[*] Scraping SERP for: {keyword}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    }
    try:
        url = f"https://www.google.com/search?q={urllib.parse.quote(keyword)}&num=10"
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Simple regex to find result blocks
        # Looking for <div class="g"> or similar patterns
        # Google's HTML is messy, so let's try a broad approach
        html = response.text
        results = []
        
        # Extract titles and links (this is a fragile regex but works for basic needs)
        matches = re.findall(r'<a href="(/url\?q=https://[^&]+)[^>]*><h3[^>]*><div[^>]*>([^<]+)</div>', html)
        if not matches:
             # Fallback regex
             matches = re.findall(r'<a href="(https://[^"]+)"[^>]*><h3[^>]*>([^<]+)</h3>', html)
        
        for i, (link, title) in enumerate(matches[:10]):
            clean_link = link
            if link.startswith("/url?q="):
                clean_link = urllib.parse.unquote(link.split("/url?q=")[1])
            
            results.append({
                "rank": i + 1,
                "title": title.strip(),
                "url": clean_link,
                "description": "" # Description is harder without a full parser
            })
            
        print(f"[*] Found {len(results)} SERP results.")
        return results
    except Exception as e:
        print(f"[!] SERP Scraping error: {e}")
        return []

def perform_url_scraping(url):
    """Extract content and headers from a URL"""
    print(f"[*] Scraping URL: {url}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text
        
        # Extract Title
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        title = title_match.group(1) if title_match else url
        
        # Extract Headers (H1, H2, H3)
        h_tags = re.findall(r'<(h[1-3])[^>]*>(.*?)</\1>', html, re.IGNORECASE | re.DOTALL)
        extracted_headers = []
        for tag, text in h_tags:
            clean_text = re.sub('<[^<]+?>', '', text).strip()
            if clean_text:
                extracted_headers.append({
                    "tag": tag.upper(),
                    "text": clean_text
                })
        
        # Extract Main Content (paragraphs)
        p_tags = re.findall(r'<p[^>]*>(.*?)</p>', html, re.IGNORECASE | re.DOTALL)
        content_parts = []
        for p in p_tags:
            clean_p = re.sub('<[^<]+?>', '', p).strip()
            if clean_p:
                content_parts.append(clean_p)
        
        full_content = "\n\n".join(content_parts[:20]) # Limit length
        
        return {
            "url": url,
            "title": title,
            "content": full_content,
            "headers": extracted_headers
        }
    except Exception as e:
        print(f"[!] URL Scraping error {url}: {e}")
        return {
            "url": url,
            "title": "Error al scrapear",
            "content": str(e),
            "headers": []
        }

async def handler(websocket):
    print(f"[+] Client connected: {websocket.remote_address}")
    connected_clients.add(websocket)
    authenticated = False
    
    try:
        async for message in websocket:
            data = json.loads(message)
            msg_type = data.get("type")
            payload = data.get("payload", {})

            # 1. Authentication
            if msg_type == "AUTH":
                if payload.get("token") == AUTH_TOKEN:
                    authenticated = True
                    print("[*] Client authenticated.")
                    await websocket.send(json.dumps({"type": "AUTH_SUCCESS"}))
                    # Trigger Unified Engine initialization on successful auth
                    asyncio.create_task(init_models(websocket))
                else:
                    await websocket.send(json.dumps({"type": "AUTH_FAILED"}))
                    await websocket.close()
                    break
                continue

            if not authenticated:
                await websocket.send(json.dumps({"type": "AUTH_REQUIRED"}))
                continue

            # 2. Status Check
            if msg_type == "CHECK_MODELS":
                await websocket.send(json.dumps({
                    "type": "MODELS_STATUS",
                    "payload": { 
                        "image_ready": image_pipeline is not None,
                        "text_ready": text_pipeline is not None
                    }
                }))

            # 3. Route: Text Generation (Gemma)
            elif msg_type == "AI_PROMPT":
                prompt_id = payload.get("id", str(uuid.uuid4()))
                text = payload.get("text", "")
                
                try:
                    print(f"[*] Text Request: {text[:50]}...")
                    # Warning: Unblocking the loop for heavy text generation
                    result = await asyncio.to_thread(generate_text_sync, text, payload.get("system", ""))
                    await websocket.send(json.dumps({
                        "type": "AI_RESPONSE_COMPLETE",
                        "payload": {"id": prompt_id, "fullText": result}
                    }))
                except Exception as e:
                    print(f"[!] Text Error: {e}")
                    await websocket.send(json.dumps({
                        "type": "AI_ERROR",
                        "payload": {"id": prompt_id, "message": str(e)}
                    }))

            # 4. Route: Image Generation (SDXL)
            elif msg_type == "GENERATE_IMAGE" or msg_type == "IMAGE_PROMPT":
                prompt = payload.get("prompt", payload.get("text", ""))
                request_id = payload.get("id", str(uuid.uuid4()))
                
                try:
                    await websocket.send(json.dumps({
                        "type": "IMAGE_GENERATING",
                        "payload": {"id": request_id}
                    }))
                    
                    b64_image = await asyncio.to_thread(generate_image_base64_sync, prompt)
                    
                    await websocket.send(json.dumps({
                        "type": "IMAGE_RESPONSE_COMPLETE",
                        "payload": {"id": request_id, "base64": b64_image, "image": b64_image} # Retrocompat
                    }))
                except Exception as e:
                    print(f"[!] Image Error: {e}")
                    await websocket.send(json.dumps({
                        "type": "IMAGE_ERROR",
                        "payload": {"id": request_id, "message": str(e), "error": str(e)}
                    }))

            # 5. Route: SERP Scraping
            elif msg_type == "SERP_REQUEST":
                keyword = payload.get("keyword", "")
                request_id = payload.get("id", str(uuid.uuid4()))
                try:
                    results = await asyncio.to_thread(perform_serp_scraping, keyword)
                    await websocket.send(json.dumps({
                        "type": "SERP_RESPONSE",
                        "payload": {"id": request_id, "results": results}
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "SERP_ERROR",
                        "payload": {"id": request_id, "message": str(e)}
                    }))

            # 6. Route: URL Scraping
            elif msg_type == "SCRAPE_REQUEST":
                urls = payload.get("urls", [])
                request_id = payload.get("id", str(uuid.uuid4()))
                try:
                    results = []
                    for url in urls:
                        data = await asyncio.to_thread(perform_url_scraping, url)
                        results.append(data)
                    
                    await websocket.send(json.dumps({
                        "type": "SCRAPE_RESPONSE",
                        "payload": {"id": request_id, "results": results}
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "SCRAPE_ERROR",
                        "payload": {"id": request_id, "message": str(e)}
                    }))

    except websockets.exceptions.ConnectionClosed:
        print("[-] Client disconnected")
    finally:
        connected_clients.discard(websocket)

async def main():       
    print(f"[*] Starting local WebSocket server on ws://{HOST}:{PORT}")
    
    # Arrancar el loop de broadcast de descargas
    asyncio.create_task(progress_broadcaster())
    
    async with websockets.serve(handler, HOST, PORT): 
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
