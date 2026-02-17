use axum::extract::State;
use axum::response::sse::{Event, KeepAlive, Sse};
use futures_util::stream::Stream;
use std::convert::Infallible;
use std::sync::Arc;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;

use crate::state::AppState;

/// SSE endpoint for live galaxy updates.
/// Streams new_puzzle and play_result events as they happen.
pub async fn galaxy_sse(
    State(state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = state.galaxy_tx.subscribe();
    let stream = BroadcastStream::new(rx).filter_map(|result| match result {
        Ok(data) => Some(Ok(Event::default().data(data))),
        Err(_) => None, // lagged — skip missed messages
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}
