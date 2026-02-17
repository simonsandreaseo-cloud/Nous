use futures_util::{SinkExt, StreamExt};

use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::accept_async;
use tauri::Emitter;

pub async fn start_server(app_handle: tauri::AppHandle) {
    let addr = "127.0.0.1:9001";
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind WebSocket server");
    
    log::info!("WebSocket server listening on: {}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        let app_handle = app_handle.clone();
        tokio::spawn(accept_connection(stream, app_handle));
    }
}

async fn accept_connection(stream: TcpStream, app_handle: tauri::AppHandle) {
    let peer = stream.peer_addr().expect("connected streams should have a peer address");
    log::info!("Peer address: {}", peer);

    let ws_stream = accept_async(stream).await.expect("Error during the websocket handshake");
    log::info!("New WebSocket connection: {}", peer);

    let (mut write, mut read) = ws_stream.split();

    // Notify frontend that a client connected
    let _ = app_handle.emit("ws-client-connected", true);

    while let Some(msg) = read.next().await {
        let msg = match msg {
            Ok(msg) => msg,
            Err(e) => {
                log::error!("Error reading message: {}", e);
                break;
            }
        };

        if msg.is_text() || msg.is_binary() {
            // Echo back for now or process command
            // For now, we just log it
            log::info!("Received URL/Command: {}", msg);
            
            // Example: Parsing command
            if let Ok(text) = msg.to_text() {
                if text.starts_with("PING") {
                    let _ = write.send("PONG".into()).await;
                }
            }
        }
    }
}
