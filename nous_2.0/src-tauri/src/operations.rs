use user_idle::UserIdle;
use std::time::Duration;
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
pub struct OperationStatus {
    pub is_idle: bool,
    pub idle_seconds: u64,
}

// Background task to monitor idle state
pub fn spawn_idle_monitor(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut was_idle = false;
        loop {
            let idle_seconds = UserIdle::get_time().map(|ti| ti.as_seconds()).unwrap_or(0);
            let is_idle = idle_seconds > 60; // Idle threshold: 60 seconds for demo

            if is_idle != was_idle {
                was_idle = is_idle;
                // Emit event only on state change to avoid spam, but could emit periodic updates too
                let _ = app.emit("operations-idle-change", OperationStatus {
                    is_idle,
                    idle_seconds,
                });
            }

            // Periodic heartbeat for UI timer sync
            if is_idle {
                 let _ = app.emit("operations-idle-update", OperationStatus {
                    is_idle,
                    idle_seconds,
                });
            }

            std::thread::sleep(Duration::from_secs(1));
        }
    });
}

// --- Integrations Stubs ---

#[derive(Serialize, Deserialize)]
pub struct TimeEntry {
    pub id: String,
    pub description: String,
    pub start_time: String,
    pub project_id: String,
}

#[tauri::command]
pub async fn start_timer_tmetric(_api_key: String, entry: TimeEntry) -> Result<String, String> {
    // Mock implementation for TMetric
    println!("Starting TMetric timer for: {}", entry.description);
    // In real app: reqwest::post("https://app.tmetric.com/api/v3/...")
    Ok("timer_started_mock_id".to_string())
}

#[tauri::command]
pub async fn stop_timer_tmetric(_api_key: String) -> Result<String, String> {
    println!("Stopping TMetric timer");
    Ok("timer_stopped".to_string())
}
