#include <opus.h>
#include <emscripten.h>
#include <string>

using namespace std;
extern "C" {
    struct OpusHandle {
        OpusEncoder* encoder = nullptr;
        OpusDecoder* decoder = nullptr;

        size_t channelCount = 1;
        int opusType = OPUS_APPLICATION_AUDIO;
    };

    EMSCRIPTEN_KEEPALIVE
    OpusHandle* codec_opus_createNativeHandle(size_t channelCount, int type) {
        printf("Inizalisize opus. (Channel count: %d Sample rate: %d Type: %d)!\n", channelCount, 48000, type);
        auto codec = new OpusHandle{};
        int error = 0;
        codec->decoder = opus_decoder_create(48000, channelCount, &error);
        codec->encoder = opus_encoder_create(48000, channelCount, type, &error);
        codec->opusType = type;
        return codec;
    }

    EMSCRIPTEN_KEEPALIVE
    void codec_opus_deleteNativeHandle(OpusHandle* codec) {
        if(!codec) return;

        if(codec->decoder) opus_decoder_destroy(codec->decoder);
        codec->decoder = nullptr;

        if(codec->encoder) opus_encoder_destroy(codec->encoder);
        codec->encoder = nullptr;

        delete codec;
    }

    EMSCRIPTEN_KEEPALIVE
    int codec_opus_encode(OpusHandle* handle, uint8_t* buffer, size_t length, size_t maxLength) {
        auto result = opus_encode_float(handle->encoder, (float*) buffer, length / handle->channelCount, buffer, maxLength);
        if(result < 0) return result;
        return result;
    }

    EMSCRIPTEN_KEEPALIVE
    int codec_opus_decode(OpusHandle* handle, uint8_t* buffer, size_t length, size_t maxLength) {
        auto result = opus_decode_float(handle->decoder, buffer, length, (float*) buffer, maxLength / sizeof(float) / handle->channelCount, false);
        if(result < 0) return result; //Failed
        return result;
    }

    EMSCRIPTEN_KEEPALIVE
    int codec_opus_changeApplication(OpusHandle* handle, int type) {
        handle->opusType = type;
        if(type != OPUS_APPLICATION_VOIP && type != OPUS_APPLICATION_AUDIO && type != OPUS_APPLICATION_RESTRICTED_LOWDELAY)
           return 1;
        return opus_encoder_ctl(handle->encoder, OPUS_SET_APPLICATION(type));
    }

    EMSCRIPTEN_KEEPALIVE
    int codec_opus_reset(OpusHandle* handle) {
        if(handle->encoder) opus_encoder_destroy(handle->encoder);
	    if(handle->decoder) opus_decoder_destroy(handle->decoder);

        int error = 0;
        handle->decoder = opus_decoder_create(48000, handle->channelCount, &error);
        handle->encoder = opus_encoder_create(48000, handle->channelCount, handle->opusType, &error);
        return 1;
    }
/*
opus_encoder_ctl(enc, OPUS_SET_BITRATE(bitrate));
opus_encoder_ctl(enc, OPUS_SET_COMPLEXITY(complexity));
opus_encoder_ctl(enc, OPUS_SET_SIGNAL(signal_type));
 */
}