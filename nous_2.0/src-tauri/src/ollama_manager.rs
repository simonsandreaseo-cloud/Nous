use tauri::{AppHandle, Manager, Emitter, Runtime};
use tauri_plugin_shell::ShellExt;
use std::sync::Arc;
use reqwest;

pub struct OllamaManager {
    app_handle: AppHandle,
}

impl OllamaManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    pub async fn is_running(&self) -> bool {
        let client = reqwest::Client::new();
        match client.get("http://localhost:11434/api/tags").send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    pub async fn start_sidecar(&self) -> Result<(), String> {
        if self.is_running().await {
            log::info!("Ollama is already running.");
            return Ok(());
        }

        log::info!("Starting Ollama sidecar...");
        let sidecar = self.app_handle.shell().sidecar("ollama")
            .map_err(|e| format!("Failed to create sidecar: {}", e))?;

        let (mut _rx, _child) = sidecar.spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

        // Give it a few seconds to start
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

        if self.is_running().await {
            Ok(())
        } else {
            Err("Ollama failed to start within timeout".to_string())
        }
    }

    pub async fn pull_model(&self, name: &str) -> Result<(), String> {
        let client = reqwest::Client::new();
        let payload = serde_json::json!({
            "name": name,
            "stream": false
        });

        let resp = client.post("http://localhost:11434/api/pull")
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if resp.status().is_success() {
            log::info!("Model {} pulled successfully", name);
            Ok(())
        } else {
            Err(format!("Failed to pull model: {}", resp.status()))
        }
    }

    pub async fn create_model_from_file(&self, name: &str, modelfile_content: &str) -> Result<(), String> {
        let client = reqwest::Client::new();
        let payload = serde_json::json!({
            "name": name,
            "modelfile": modelfile_content
        });

        let resp = client.post("http://localhost:11434/api/create")
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if resp.status().is_success() {
            log::info!("Model {} created successfully from content", name);
            Ok(())
        } else {
            Err(format!("Failed to create model: {}", resp.status()))
        }
    }
}
