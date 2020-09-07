use crate::audio::{AudioPacket, Codec};
use crate::audio::codec::opus::{Channels};
use std::rc::Rc;
use std::cell::RefCell;
use std::fmt::Formatter;

#[derive(Debug, PartialEq)]
pub enum AudioDecodeError {
    UnknownCodec,
    UnsupportedCodec,
    DecoderInitializeFailed(String, bool /* just now initialized */),
    DecoderUninitialized,
    InvalidPacket,
    UnknownDecodeError(String)
}

enum DecoderState {
    Unset,
    Initialized(Rc<RefCell<dyn AudioCodecDecoder>>),
    InitializeFailed(String)
}

impl std::fmt::Debug for DecoderState {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            DecoderState::Unset => {
                f.write_str("DecoderState::Unset")
            }
            DecoderState::Initialized(_) => {
                f.write_str("DecoderState::Initialized")
            }
            DecoderState::InitializeFailed(error) => {
                f.write_str(&format!("DecoderState::InitializeFailed({:?})", error))
            }
        }
    }
}

pub struct AudioDecoder {
    opus_decoder: DecoderState,
    opus_music_decoder: DecoderState,

    last_decoded_codec: Codec,
}

impl AudioDecoder {
    pub fn new() -> AudioDecoder {
        AudioDecoder {
            opus_music_decoder: DecoderState::Unset,
            opus_decoder: DecoderState::Unset,

            last_decoded_codec: Codec::Opus,
        }
    }

    fn decoder_state(&mut self, codec: Codec) -> Result<&mut DecoderState, AudioDecodeError> {
        match codec {
            Codec::Opus => {
                Ok(&mut self.opus_decoder)
            }
            Codec::OpusMusic => {
                Ok(&mut self.opus_music_decoder)
            }
            Codec::SpeexNarrow | Codec::SpeexWide | Codec::SpeexUltraWide | Codec::Celt | Codec::Flac => {
                Err(AudioDecodeError::UnsupportedCodec)
            }
            _ => {
                Err(AudioDecodeError::UnknownCodec)
            }
        }
    }

    fn get_decoder(&mut self, codec: Codec, initialize: bool) -> Result<Rc<RefCell<dyn AudioCodecDecoder>>, AudioDecodeError> {
        let decoder_state = self.decoder_state(codec)?;

        match decoder_state {
            DecoderState::Initialized(decoder) => {
                Ok(decoder.clone())
            }
            DecoderState::InitializeFailed(error) => {
                Err(AudioDecodeError::DecoderInitializeFailed(error.clone(), false))
            }
            DecoderState::Unset => {
                if !initialize {
                    return Err(AudioDecodeError::DecoderUninitialized);
                }

                let decoder: Option<Rc<RefCell<dyn AudioCodecDecoder>>>;
                match codec {
                    Codec::Opus => {
                        decoder = Some(Rc::new(RefCell::new(decoder::AudioOpusDecoder::new(Channels::Mono))));
                    }
                    Codec::OpusMusic => {
                        decoder = Some(Rc::new(RefCell::new(decoder::AudioOpusDecoder::new(Channels::Stereo))));
                    }
                    _ => {
                        panic!("This should never be reached");
                    }
                }

                let decoder = decoder.unwrap();
                if let Err(error) = decoder.borrow_mut().initialize() {
                    *decoder_state = DecoderState::InitializeFailed(error.clone());
                    return Err(AudioDecodeError::DecoderInitializeFailed(error, true));
                }

                *decoder_state = DecoderState::Initialized(decoder.clone());
                Ok(decoder)
            }
        }
    }

    pub fn decode(&mut self, packet: &AudioPacket, dest: &mut Vec<f32>) -> Result<(usize /* samples */, u8 /* channels */), AudioDecodeError> {
        let audio_decoder = self.get_decoder(packet.codec, true)?;
        let mut audio_decoder = audio_decoder.borrow_mut();

        let result = audio_decoder.decode(&packet.payload, dest)?;
        self.last_decoded_codec = packet.codec;
        Ok(result)
    }

    pub fn decode_lost(&mut self, _packet_count: usize) -> Result<(), AudioDecodeError> {
        /* if the decoder hasn't been initialized or something similar it's not worth creating one */
        if let Ok(decoder) = self.get_decoder(self.last_decoded_codec, false) {
            decoder.borrow_mut().decode_lost()?;
        }

        Ok(())
    }
}

trait AudioCodecDecoder {
    /// Initialize the decoder.
    /// On error occurrence, the error message will be returned
    fn initialize(&mut self) -> Result<(), String>;

    /// Decode the audio packet to float 32 interleaved samples.
    /// Returns the amount of samples decoded.
    fn decode(&mut self, src: &Vec<u8>, dest: &mut Vec<f32>) -> Result<(usize /* samples */, u8 /* channels */), AudioDecodeError>;

    fn decode_lost(&mut self) -> Result<(), AudioDecodeError>;
}

mod decoder {
    /* the opus implementation */
    use crate::audio::codec::opus::{Decoder, Channels, ErrorCode};
    use crate::audio::decoder::{AudioCodecDecoder, AudioDecodeError};
    use log::warn;

    pub struct AudioOpusDecoder {
        pub channel_count: Channels,
        pub sample_rate: u32,

        decoder: Option<Decoder>,

        /// If it's set it indicates that we have to do some FEC decoding.
        /// The option will hold the packet size, used for the FEC decoding.
        fec_decode: Option<usize>
    }

    impl AudioOpusDecoder {
        pub fn new(channels: Channels) -> AudioOpusDecoder {
            AudioOpusDecoder {
                decoder: None,
                channel_count: channels,
                sample_rate: 48_000,

                fec_decode: None
            }
        }
    }

    impl AudioCodecDecoder for AudioOpusDecoder {
        fn initialize(&mut self) -> Result<(), String> {
            let decoder = Decoder::new(self.sample_rate, self.channel_count).map_err(|error| String::from(error.description()))?;
            self.decoder = Some(decoder);
            Ok(())
        }

        fn decode(&mut self, src: &Vec<u8>, dest: &mut Vec<f32>) -> Result<(usize, u8), AudioDecodeError> {
            if let Some(ref mut decoder) = self.decoder {
                let sample_count = decoder.get_nb_samples(src.as_slice())
                    .map_err(|_error| AudioDecodeError::InvalidPacket)?;

                let mut total_sample_count = 0;
                if let Some(fec_size) = self.fec_decode {
                    self.fec_decode = None;
                    dest.resize(
                        fec_size as usize * self.channel_count as usize +
                            sample_count * self.channel_count as usize, 0f32);

                    match decoder.decode_float(src.as_slice(), &mut dest[0..(fec_size * self.channel_count as usize)], true) {
                        Ok(sample_count) => total_sample_count += sample_count,
                        Err(error) => {
                            warn!("Failed to FEC decode opus packet: {}", error.description());
                        }
                    };
                } else {
                    dest.resize(sample_count * self.channel_count as usize, 0f32);
                }

                match decoder.decode_float(src.as_slice(), &mut dest[(total_sample_count * self.channel_count as usize)..], false) {
                    Ok(sample_count) => Ok((total_sample_count + sample_count, self.channel_count as u8)),
                    Err(error) => match error.code() {
                        ErrorCode::InvalidPacket => {
                            Err(AudioDecodeError::InvalidPacket)
                        }
                        _ => {
                            Err(AudioDecodeError::UnknownDecodeError(String::from(error.description())))
                        }
                    }
                }
            } else {
                Err(AudioDecodeError::DecoderUninitialized)
            }
        }

        fn decode_lost(&mut self) -> Result<(), AudioDecodeError> {
            if let Some(ref mut decoder) = self.decoder {
                /* 960 is the default packet size for TeaSpeak */
                let packet_size = decoder.get_last_packet_duration().unwrap_or(960) as usize;
                self.fec_decode = Some(packet_size);
                Ok(())
            } else {
                Err(AudioDecodeError::DecoderUninitialized)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::audio::decoder::{AudioDecoder, AudioDecodeError};
    use crate::audio::{AudioPacket, PacketId, Codec};

    #[test]
    fn test_invalid_packet() {
        let mut decoder = AudioDecoder::new();
        let mut buffer: Vec<f32> = Vec::new();
        let packet = AudioPacket {
            codec: Codec::Opus,
            payload: vec![],
            packet_id: PacketId::new(0),
            client_id: 0
        };
        assert_eq!(decoder.decode(&packet, &mut buffer), Err(AudioDecodeError::InvalidPacket));

        let packet = AudioPacket {
            codec: Codec::Opus,
            payload: vec![0, 0, 1],
            packet_id: PacketId::new(0),
            client_id: 0
        };
        decoder.decode(&packet, &mut buffer).expect("expected a result");

        let packet = AudioPacket {
            codec: Codec::Flac,
            payload: vec![],
            packet_id: PacketId::new(0),
            client_id: 0
        };
        assert_eq!(decoder.decode(&packet, &mut buffer), Err(AudioDecodeError::UnsupportedCodec));
    }
}
