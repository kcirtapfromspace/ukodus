use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;

use crate::state::AppState;

/// Upgrade HTTP to WebSocket for live galaxy updates.
pub async fn galaxy_ws(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_galaxy_ws(socket, state))
}

async fn handle_galaxy_ws(socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.galaxy_tx.subscribe();
    let (mut sender, mut receiver) = socket.split();

    // Forward broadcast events to the WebSocket client
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Drain incoming messages (we don't expect any, but keep the connection alive)
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if matches!(msg, Message::Close(_)) {
                break;
            }
        }
    });

    // When either task ends, abort the other
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }
}
