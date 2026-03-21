import os
import platform
from huggingface_hub import hf_hub_download

APP_ID = "com.nous.clinical"
if platform.system() == "Windows":
    BASE_APP_DATA = os.getenv("APPDATA")
PERSISTENT_MODEL_DIR = os.path.join(BASE_APP_DATA, APP_ID, "models")
os.makedirs(PERSISTENT_MODEL_DIR, exist_ok=True)

TEXT_MODEL_REPO = "bartowski/google_gemma-3-4b-it-GGUF"
TEXT_MODEL_FILE = "google_gemma-3-4b-it-Q4_K_M.gguf"

print(f"[*] Testing download to: {PERSISTENT_MODEL_DIR}")
try:
    # Test head only (force_download=False would check existence)
    path = hf_hub_download(
        repo_id=TEXT_MODEL_REPO,
        filename=TEXT_MODEL_FILE,
        cache_dir=PERSISTENT_MODEL_DIR,
        local_dir=PERSISTENT_MODEL_DIR,
        local_dir_use_symlinks=False,
        token=None # No token needed for public
    )
    print(f"[*] Path: {path}")
except Exception as e:
    print(f"[!] Error: {e}")
