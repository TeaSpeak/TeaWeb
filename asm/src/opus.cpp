#include <opus.h>
#include <array>
#include <string_view>
#include <emscripten.h>
#include <string>

typedef std::unique_ptr<OpusEncoder, decltype(opus_encoder_destroy)*> opus_encoder_t;
typedef std::unique_ptr<OpusDecoder, decltype(opus_decoder_destroy)*> opus_decoder_t;
struct OpusHandle {
    opus_encoder_t encoder{nullptr, opus_encoder_destroy};
    opus_decoder_t decoder{nullptr, opus_decoder_destroy};

    size_t channelCount{1};
    size_t sampleRate{48000};
    int opusType{OPUS_APPLICATION_AUDIO};
};

constexpr std::array<std::string_view, 7> opus_errors = {
        "One or more invalid/out of range arguments",                   //-1 (OPUS_BAD_ARG)
        "Not enough bytes allocated in the buffer",                     //-2 (OPUS_BUFFER_TOO_SMALL)
        "An internal error was detected",                               //-3 (OPUS_INTERNAL_ERROR)
        "The compressed data passed is corrupted",                      //-4 (OPUS_INVALID_PACKET)
        "Invalid/unsupported request number",                           //-5 (OPUS_UNIMPLEMENTED)
        "An encoder or decoder structure is invalid or already freed",  //-6 (OPUS_INVALID_STATE)
        "Memory allocation has failed"                                  //-7 (OPUS_ALLOC_FAIL)
};

inline std::string_view opus_error_message(int error) {
    error = abs(error);
    if (error > 0 && error <= 7) return opus_errors[error - 1];
    return "undefined error";
}

inline bool reinitialize_decoder(OpusHandle *handle) {
    int error;
    handle->decoder.reset(opus_decoder_create(handle->sampleRate, handle->channelCount, &error));
    if(error != OPUS_OK) {
        printf("Failed to create decoder (%s)\n", opus_error_message(error).data());
        return false;
    }
    return true;
}

inline bool reinitialize_encoder(OpusHandle *handle) {
    int error;
    handle->encoder.reset(opus_encoder_create(handle->sampleRate, handle->channelCount, handle->opusType, &error));
    if (error != OPUS_OK) {
        printf("Failed to create encoder (%s)\n", opus_error_message(error).data());
        return false;
    }

    if(error = opus_encoder_ctl(&*handle->encoder, OPUS_SET_COMPLEXITY(1)); error != OPUS_OK) {
        printf("Failed to setup encoder (%s)\n", opus_error_message(error).data());
        return false;
    }
    //TODO: May set OPUS_SET_BITRATE(4740)?
    //TODO: Is the encoder event needed anymore? Or is it just overhead
    return true;
}

#ifdef __cplusplus
extern "C" {
#endif
EMSCRIPTEN_KEEPALIVE
OpusHandle *codec_opus_createNativeHandle(size_t channelCount, int type) {
    auto codec = new OpusHandle{};
    codec->opusType = type;
    codec->channelCount = channelCount;
    codec->sampleRate = 48000;
    if (!reinitialize_decoder(codec)) return nullptr;
    if (!reinitialize_encoder(codec)) return nullptr;
    return codec;
}

EMSCRIPTEN_KEEPALIVE
void codec_opus_deleteNativeHandle(OpusHandle *codec) {
    if (!codec) return;

    codec->decoder.reset();
    codec->encoder.reset();
    delete codec;
}

EMSCRIPTEN_KEEPALIVE
int codec_opus_encode(OpusHandle *handle, uint8_t *buffer, size_t length, size_t maxLength) {
    auto result = opus_encode_float(&*handle->encoder, (float *) buffer, length / handle->channelCount, buffer, maxLength);
    if (result < 0) return result;
    return result;
}

EMSCRIPTEN_KEEPALIVE
int codec_opus_decode(OpusHandle *handle, uint8_t *buffer, size_t length, size_t maxLength) {
    auto result = opus_decode_float(&*handle->decoder, buffer, length, (float *) buffer, maxLength / sizeof(float) / handle->channelCount, false);
    if (result < 0) return result;
    return result;
}

EMSCRIPTEN_KEEPALIVE
int codec_opus_reset(OpusHandle *handle) {
    if (!reinitialize_decoder(handle)) return 0;
    if (!reinitialize_encoder(handle)) return 0;
    return 1;
}
#ifdef __cplusplus
}
#endif