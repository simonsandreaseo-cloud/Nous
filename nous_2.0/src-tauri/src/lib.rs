mod ws_server;

use std::fs;
use tauri::{AppHandle, Emitter, Manager};
use std::sync::Mutex;

struct PendingDeepLink(Mutex<Option<String>>);

#[tauri::command]
fn get_pending_deep_link(state: tauri::State<PendingDeepLink>) -> Option<String> {
    state.0.lock().unwrap().take()
}

#[tauri::command]
fn ping_node() -> String {
    format!("Local Node Active (v{})", env!("CARGO_PKG_VERSION"))
}

#[tauri::command]
fn list_local_directory(path: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Some(name) = entry.file_name().to_str() {
                files.push(name.to_string());
            }
        }
    }
    Ok(files)
}

mod crawler;
mod intelligence;
mod refinery;
mod operations;

use sysinfo::System;
use crawler::CrawlResult; // Re-export struct if needed for TS type gen

struct SystemState {
    sys: Mutex<System>,
}

#[derive(serde::Serialize)]
struct SystemStats {
    cpu_usage: f32,
    memory_usage: u64,
    total_memory: u64,
}

#[tauri::command]
fn get_system_stats(state: tauri::State<SystemState>) -> SystemStats {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_cpu_all(); // Refreshing CPU usage.
    sys.refresh_memory();
    
    let cpu_usage = sys.global_cpu_usage();
    let memory_usage = sys.used_memory();
    let total_memory = sys.total_memory();

    SystemStats {
        cpu_usage,
        memory_usage,
        total_memory,
    }
}

// Wrapper for the crawler command to matching tauri signatures
#[tauri::command]
async fn start_crawl_command(app: AppHandle, url: String, proxy: Option<String>) -> Result<CrawlResult, String> {
    let proxy_str = proxy.as_deref();
    crawler::start_crawl(app, url, proxy_str).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let _ = app.get_webview_window("main").expect("no main window").set_focus();
            
            // Check for deep link in args
            for arg in args {
                if arg.starts_with("nous://") {
                    let _ = app.emit("nous-deep-link", arg);
                }
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .manage(PendingDeepLink(Mutex::new(None)))
        .manage(SystemState { sys: Mutex::new(System::new_all()) })
        .invoke_handler(tauri::generate_handler![
            ping_node, 
            list_local_directory, 
            get_pending_deep_link, 
            get_system_stats, 
            start_crawl_command,
            crawler::scrape_google_serp,
            refinery::load_dataset,
            refinery::clean_dataset,
            refinery::save_dataset,
            operations::start_timer_tmetric,
            operations::stop_timer_tmetric
        ])
        .setup(|app| {
            operations::spawn_idle_monitor(app.handle().clone());

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Register deep link scheme "nous"
            // This works in dev and usually in prod if not handled by installer
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register("nous");
            }
            
            // Check command line args for cold start deep link
            let args: Vec<String> = std::env::args().collect();
            for arg in &args {
                 if arg.starts_with("nous://") {
                     *app.state::<PendingDeepLink>().0.lock().unwrap() = Some(arg.clone());
                 }
            }

            // Start WebSocket Server
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                ws_server::start_server(handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
