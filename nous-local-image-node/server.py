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

print("[*] BUILD_MARKER_9999")
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

from piexif import ImageIFD, ExifIFD
from io import BytesIO
from diffusers import AutoPipelineForText2Image
from huggingface_hub import hf_hub_download
import huggingface_hub.utils.tqdm as hf_tqdm
from tqdm.auto import tqdm as std_tqdm
from llama_cpp import Llama

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

# Variables globales para los modelos
image_pipeline = None
text_pipeline = None
connected_clients = set()
ws_queue = collections.deque()
current_download_model = "model"

# --- TQDM Monkey Patch for Progress Bars ---
class WSTqdm(std_tqdm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # print(f"[DEBUG TQDM] Init for {current_download_model}")
        
    def update(self, n=1):
        super().update(n)
        # Only broadcast large chunks (files > 1MB) to avod noise
        if self.total is not None and self.total > 1000: # Lowered threshold for debugging
            # print(f"[DEBUG TQDM] {current_download_model}: {self.n}/{self.total}")
            ws_queue.append({
                "model": current_download_model,
                "progress": round((self.n / self.total) * 100, 1),
                "downloaded": self.n,
                "total": self.total
            })

hf_tqdm.tqdm = WSTqdm
import tqdm.auto
tqdm.auto.tqdm = WSTqdm


async def progress_broadcaster():
    """Background task to broadcast tqdm progress from the queue"""
    while True:
        while ws_queue:
            msg = ws_queue.popleft()
            # print(f"[DEBUG BROADCASTER] Popped message: {msg['model']} {msg['progress']}%")
            targets = list(connected_clients)
            for ws in targets:
                try:
                    await ws.send(json.dumps({
                        "type": "DOWNLOAD_PROGRESS",
                        "payload": msg
                    }))
                except:
                    pass
        await asyncio.sleep(0.5)

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
    global image_pipeline, text_pipeline
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[*] Initializing Unified Engine on: {device}")
    
    # 1. Load Text Model (Gemma 3)
    if not text_pipeline:
        path = await download_model_with_progress(TEXT_MODEL_REPO, TEXT_MODEL_FILE, websocket, "Gemma-3-4B")
        if path:
            print("[*] Loading Llama.cpp for Gemma 3...")
            # Unblock the event loop while the massive file is loaded into VRAM/RAM
            text_pipeline = await asyncio.to_thread(
                Llama,
                model_path=path,
                n_gpu_layers=-1 if device == "cuda" else 0, # Offload to GPU if available
                n_ctx=2048,
                verbose=False
            )
            print("[*] Text Engine Ready!")
            if websocket:
                await websocket.send(json.dumps({"type": "ENGINE_READY", "payload": {"engine": "text"}}))

    # 2. Load Image Model (SDXL Turbo)
    if not image_pipeline:     
        global current_download_model
        current_download_model = "SDXL-Turbo"
        if websocket:
            await websocket.send(json.dumps({
                "type": "DOWNLOAD_STATUS",
                "payload": { "model": "SDXL-Turbo", "status": "downloading" }
            }))
            
        try:
            print("[*] Loading SDXL Turbo pipeline...")
            image_pipeline = await asyncio.to_thread(
                AutoPipelineForText2Image.from_pretrained,
                IMAGE_MODEL_ID, 
                torch_dtype=torch.float16 if device == "cuda" else torch.float32, 
                variant="fp16" if device == "cuda" else None,
                use_safetensors=True,
                cache_dir=PERSISTENT_MODEL_DIR
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
            print(f"[!] Image Error: {e}")
            if websocket:
                await websocket.send(json.dumps({
                    "type": "DOWNLOAD_STATUS",
                    "payload": { "model": "SDXL-Turbo", "status": "error", "message": str(e) }
                }))

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
