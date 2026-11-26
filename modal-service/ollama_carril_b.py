"""Servidor serverless de Ollama (gemma3:4b) en GPU NVIDIA L4 para Carril B de Nous."""

import hmac
import os
import subprocess
import time
import modal


OLLAMA_IMAGE = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("curl", "ca-certificates", "pciutils", "zstd")
    .run_commands("curl -fsSL https://ollama.com/install.sh | sh")
    .pip_install("fastapi[standard]", "httpx")
    .env(
        {
            "OLLAMA_HOST": "127.0.0.1:11434",
            "OLLAMA_MODELS": "/root/.ollama/models",
            "OLLAMA_NUM_PARALLEL": "2",
            "OLLAMA_MAX_LOADED_MODELS": "1",
            "OLLAMA_KEEP_ALIVE": "10m",
        }
    )
    .run_commands(
        "bash -lc '"
        "ollama serve >/tmp/ollama-build.log 2>&1 & "
        "OLLAMA_PID=$!; "
        "for i in $(seq 1 30); do "
        "  curl -sf http://127.0.0.1:11434/api/version >/dev/null && break; "
        "  sleep 1; "
        "done; "
        "ollama pull gemma3:4b; "
        "kill $OLLAMA_PID; "
        "wait $OLLAMA_PID 2>/dev/null || true'"
    )
)

app = modal.App("nous-ollama-carril-b")


@app.cls(
    image=OLLAMA_IMAGE,
    gpu="L4",
    cpu=2,
    memory=8192,
    min_containers=0,
    max_containers=2,
    scaledown_window=25,
    timeout=600,
    startup_timeout=180,
    secrets=[modal.Secret.from_name("nous-ollama-auth")],
)
@modal.concurrent(max_inputs=4)
class OllamaCarrilBService:
    @modal.enter()
    def start_ollama(self):
        import httpx

        self.proc = subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
        )
        deadline = time.time() + 45.0
        while True:
            try:
                res = httpx.get("http://127.0.0.1:11434/api/version", timeout=3.0)
                if res.status_code == 200:
                    break
            except Exception:
                pass
            if time.time() > deadline:
                raise RuntimeError("Ollama no respondió dentro de 45s al arrancar.")
            time.sleep(0.5)

        # Precargar gemma3:4b en VRAM durante el arranque frío
        try:
            httpx.post(
                "http://127.0.0.1:11434/api/chat",
                json={
                    "model": "gemma3:4b",
                    "messages": [{"role": "user", "content": "ok"}],
                    "stream": False,
                    "keep_alive": "10m",
                    "options": {"num_predict": 1},
                },
                timeout=90.0,
            )
        except Exception:
            pass

    @modal.exit()
    def stop_ollama(self):
        proc = getattr(self, "proc", None)
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except Exception:
                proc.kill()

    @modal.asgi_app(label="nous-ollama-carril-b")
    def web(self):
        import httpx
        from fastapi import FastAPI, HTTPException, Request
        from fastapi.responses import Response

        web_app = FastAPI(title="Nous Carril B Ollama Proxy")
        client = httpx.AsyncClient(base_url="http://127.0.0.1:11434", timeout=300.0)

        def check_auth(request: Request):
            expected = os.environ.get("NOUS_OLLAMA_TOKEN", "").strip()
            if not expected:
                raise HTTPException(status_code=500, detail="Auth secret not configured")
            auth_header = request.headers.get("authorization", "")
            if not auth_header.lower().startswith("bearer "):
                raise HTTPException(status_code=401, detail="Unauthorized")
            provided = auth_header[7:].strip()
            if not hmac.compare_digest(provided, expected):
                raise HTTPException(status_code=401, detail="Unauthorized")

        @web_app.get("/health")
        async def health(request: Request):
            check_auth(request)
            r = await client.get("/api/version", timeout=5.0)
            return {"ok": r.status_code == 200, "gpu": "L4", "model": "gemma3:4b"}

        @web_app.api_route("/api/{path:path}", methods=["GET", "POST", "DELETE"])
        async def proxy_ollama(path: str, request: Request):
            check_auth(request)
            body = await request.body()
            headers = {}
            ct = request.headers.get("content-type")
            if ct:
                headers["content-type"] = ct
            upstream = await client.request(
                method=request.method,
                url=f"/api/{path}",
                content=body if body else None,
                headers=headers,
            )
            media_type = upstream.headers.get("content-type", "application/json")
            return Response(
                content=upstream.content,
                status_code=upstream.status_code,
                media_type=media_type,
            )

        return web_app
