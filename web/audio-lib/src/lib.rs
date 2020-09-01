#![feature(c_variadic)]
extern crate wasm_bindgen;

#[cfg(target_arch = "wasm32")]
extern crate console_error_panic_hook;

mod audio;
mod audio_client;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::{ spawn_local };

use js_sys;
use wasm_timer;

use std::time::Duration;
use log::*;
use audio::packet_queue::AudioPacketQueue;
use crate::audio::codec::opus;
use crate::audio_client::{AudioClientId, AudioClient, AudioCallback};
use crate::audio::{AudioPacket, Codec, PacketId};
use crate::audio::packet_queue::EnqueueError;
use crate::audio::converter::interleaved2sequenced;
use once_cell::unsync::Lazy;
use std::sync::Mutex;

#[cfg(not(target_arch = "wasm32"))]
extern crate simple_logger;

#[wasm_bindgen]
extern {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    #[wasm_bindgen]
    fn alert(s: &str);
}


/// If the initialization failed, optional result will contain the error.
#[wasm_bindgen]
pub fn initialize() -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    console_log::init_with_level(Level::Trace);

    #[cfg(target_arch = "wasm32")]
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));

    info!("Initializing audio lib with opus version: {}", opus::version());
    None
}

#[wasm_bindgen]
pub fn audio_client_create() -> AudioClientId {
    let client = AudioClient::new();
    AudioClient::dispatch_processing_in_this_thread(client.clone());
    client.client_id
}

/// Let the audio client say hi (mutable).
/// If an error occurs or the client isn't known an exception will be thrown.
#[wasm_bindgen]
pub fn audio_client_enqueue_buffer(client_id: AudioClientId, buffer: &[u8], packet_id: u16, codec: u8) -> Result<(), JsValue> {
    let client = AudioClient::find_client(client_id).ok_or_else(|| JsValue::from_str("missing audio client"))?;
    let result = client.enqueue_audio_packet(Box::new(AudioPacket{
        client_id: 0,
        codec: Codec::from_u8(codec),
        packet_id: PacketId{ packet_id },
        payload: buffer.to_vec()
    }));
    if let Err(error) = result {
        return Err(match error {
            EnqueueError::PacketAlreadyExists => JsValue::from_str("packet already exists"),
            EnqueueError::PacketSequenceMismatch(_) => JsValue::from_str("packet belongs to an invalid sequence"),
            EnqueueError::PacketTooOld => JsValue::from_str("packet is too old"),
            EnqueueError::EventQueueOverflow => JsValue::from_str("event queue overflow")
        });
    }

    Ok(())
}

struct JsAudioCallback {
    callback: js_sys::Function,
}

/* No locking needed, within the web client no multi threading is needed */
static mut AUDIO_SEQUENCED_BUFFER: Lazy<Vec<f32>> = Lazy::new(|| Vec::new());
static mut AUDIO_BUFFER: Lazy<Vec<f32>> = Lazy::new(|| Vec::new());
impl AudioCallback for JsAudioCallback {
    fn callback_buffer(&mut self) -> &mut Vec<f32> {
        unsafe { &mut *AUDIO_BUFFER }
    }

    fn handle_audio(&mut self, sample_count: usize, channel_count: u8) {
        if channel_count > 1 {
            let mut sequenced_buffer = unsafe { &mut *AUDIO_SEQUENCED_BUFFER };
            sequenced_buffer.resize(sample_count * channel_count as usize, 0f32);
            interleaved2sequenced(
                unsafe { &mut *AUDIO_BUFFER }.as_slice(),
                sequenced_buffer.as_mut_slice(),
                sample_count as u32,
                channel_count as u32
            );

            let _ = self.callback.call3(
                &JsValue::undefined(),
                &JsValue::from(sequenced_buffer.as_ptr() as u32),
                &JsValue::from(sample_count as u16),
                &JsValue::from(channel_count)
            );
        } else {
            let _ = self.callback.call3(
                &JsValue::undefined(),
                &JsValue::from(unsafe { &mut *AUDIO_BUFFER }.as_ptr() as u32),
                &JsValue::from(sample_count as u16),
                &JsValue::from(channel_count)
            );
        }
    }

    fn handle_stop(&mut self) {
        let _ = self.callback.call3(
            &JsValue::undefined(),
            &JsValue::undefined(),
            &JsValue::from(0),
            &JsValue::from(0)
        );
    }
}

#[wasm_bindgen]
pub fn audio_client_buffer_callback(client_id: AudioClientId, callback: js_sys::Function) -> Result<(), JsValue> {
    let client = AudioClient::find_client(client_id).ok_or_else(|| JsValue::from_str("missing audio client"))?;
    client.set_audio_callback(Some(Box::new(JsAudioCallback{
        callback
    })));
    Ok(())
}

#[wasm_bindgen]
pub fn audio_client_destroy(client_id: AudioClientId) -> Result<(), JsValue> {
    let client = AudioClient::find_client(client_id).ok_or_else(|| JsValue::from_str("missing audio client"))?;
    client.destroy();
    debug!("Destroying client");
    Ok(())
}