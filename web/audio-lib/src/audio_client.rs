use std::collections::HashMap;
use std::sync::{ Arc, Mutex };
use std::sync::atomic::{ AtomicU32, Ordering };
use once_cell::sync::Lazy;
use crate::audio::packet_queue::{AudioPacketQueue, AudioPacketQueueEvent, EnqueueError};
use futures;
use crate::audio::decoder::{AudioDecoder};
use wasm_bindgen_futures::spawn_local;
use futures::future::{ poll_fn };
use crate::audio::{AudioPacket};
use log::*;

pub type AudioClientId = u32;

pub trait AudioCallback {
    /// Allocate the vector the result should be stored into
    fn callback_buffer(&mut self) -> &mut Vec<f32>;

    fn handle_audio(&mut self, sample_count: usize, channel_count: u8);
    fn handle_stop(&mut self);
}

pub struct AudioClient {
    pub client_id: AudioClientId,

    packet_queue: Mutex<AudioPacketQueue>,
    decoder: Mutex<AudioDecoder>,

    audio_process_abort_handle: Mutex<Option<futures::future::AbortHandle>>,

    audio_callback: Mutex<Option<Box<dyn AudioCallback>>>,
}

type AudioClientRegistry = Mutex<HashMap<AudioClientId, Arc<AudioClient>>>;

static AUDIO_CLIENT_ID: AtomicU32 = AtomicU32::new(1);
static AUDIO_CLIENT_INSTANCES: Lazy<AudioClientRegistry> = Lazy::new(|| Mutex::new(HashMap::new()));
impl AudioClient {
    pub fn find_client(client_id: AudioClientId) -> Option<Arc<AudioClient>> {
        AUDIO_CLIENT_INSTANCES.lock().unwrap().get(&client_id).map(|client| client.clone())
    }

    pub fn new() -> Arc<AudioClient> {
        let client_id = AUDIO_CLIENT_ID.fetch_add(1, Ordering::Relaxed);
        let instance = Arc::new(AudioClient {
            client_id,
            packet_queue: Mutex::new(AudioPacketQueue::new()),
            decoder: Mutex::new(AudioDecoder::new()),
            audio_callback: Mutex::new(None),
            audio_process_abort_handle: Mutex::new(None)
        });

        AUDIO_CLIENT_INSTANCES.lock().unwrap().insert(client_id, instance.clone());
        instance
    }

    pub fn destroy(&self) {
        AUDIO_CLIENT_INSTANCES.lock().unwrap().remove(&self.client_id);
        self.abort_audio_processing();
    }

    pub fn enqueue_audio_packet(&self, packet: Box<AudioPacket>, is_head_packet: bool) -> Result<(), EnqueueError> {
        self.packet_queue.lock().unwrap().enqueue_packet(packet, is_head_packet)?;
        Ok(())
    }

    pub fn set_audio_callback(&self, callback: Option<Box<dyn AudioCallback>>) {
        *self.audio_callback.lock().unwrap() = callback;
    }

    pub fn abort_audio_processing(&self) {
        let handle = &mut *self.audio_process_abort_handle.lock().unwrap();
        if let Some(ref abort_handle) = handle {
            abort_handle.abort()
        }
        *handle = None;
    }

    pub fn dispatch_processing_in_this_thread(client: Arc<AudioClient>) {
        let client_copy = client.clone();
        let (future, abort_handle) = futures::future::abortable(async move {
            loop {
                let client = client_copy.clone();
                let packet_event = poll_fn(|cx| client.packet_queue.lock().unwrap().poll_event(cx)).await;
                let client = client_copy.clone();

                match packet_event {
                    AudioPacketQueueEvent::PacketsLost(_reason, _first_packet, count) => {
                        //debug!("{:?} packets got lost due to {:?} (first packet id: {:?})", count, reason, first_packet);
                        if let Err(error) = client.decoder.lock().unwrap().decode_lost(count.into()) {
                            error!("Failed to execute decode lost packet: {:?}", error);
                        };
                    }
                    AudioPacketQueueEvent::AudioPacket(packet) => {
                        if packet.is_stop() {
                            if let Some(ref mut callback) = *client.audio_callback.lock().unwrap() {
                                callback.handle_stop();
                            }
                        } else {
                            let mut callback = client.audio_callback.lock().unwrap();
                            if callback.is_none() {
                                break;
                            }

                            let callback = callback.as_mut().unwrap();
                            let callback_buffer = callback.callback_buffer();

                            let decode_result = client.decoder.lock().unwrap().decode(&*packet, callback_buffer);
                            if let Ok(decoded) = decode_result {
                                callback.handle_audio(decoded.0, decoded.1);
                            } else {
                                warn!("Failed to decode audio packet: {:?}", decode_result.unwrap_err());
                            }
                        }
                    }
                }
            }
        });

        *client.audio_process_abort_handle.lock().unwrap() = Some(abort_handle);
        spawn_local(async { let _ = future.await; });
    }
}

impl Drop for AudioClient {
    fn drop(&mut self) {
        self.abort_audio_processing();
        debug!("Audio client destroyed");
    }
}

unsafe impl Sync for AudioClient {}
unsafe impl Send for AudioClient {}