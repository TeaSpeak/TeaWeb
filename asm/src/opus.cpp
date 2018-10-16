#include <opus.h>
#include <emscripten.h>
#include <string>

using namespace std;
extern "C" {
    struct OpusHandle {
        OpusEncoder* encoder = nullptr;
        OpusDecoder* decoder = nullptr;

        size_t channelCount = 1;
	    size_t sampleRate = 48000;
        int opusType = OPUS_APPLICATION_AUDIO;
    };

	const char* opus_errors[7] = {
			"One or more invalid/out of range arguments", //-1 (OPUS_BAD_ARG)
			"Not enough bytes allocated in the buffer", //-2 (OPUS_BUFFER_TOO_SMALL)
			"An internal error was detected", //-3 (OPUS_INTERNAL_ERROR)
			"The compressed data passed is corrupted", //-4 (OPUS_INVALID_PACKET)
			"Invalid/unsupported request number", //-5 (OPUS_UNIMPLEMENTED)
			"An encoder or decoder structure is invalid or already freed", //-6 (OPUS_INVALID_STATE)
			"Memory allocation has failed" //-7 (OPUS_ALLOC_FAIL)
	};

	inline const char* opus_error_message(int error) {
		error = abs(error);
		if(error > 0 && error <= 7) return opus_errors[error - 1];
		return "undefined error";
	}

	inline int currentMillies() {
		return EM_ASM_INT({ return Date.now(); });
	}

	#define _S(x) #x
	#define INVOKE_OPUS(result, method, ...)                                                                                        \
	result = method( __VA_ARGS__ );                                                                                                 \
	if(error != 0){                                                                                                                 \
		printf("Got opus error while invoking %s. Code: %d Message: %s\n", _S(method), error, opus_error_message(error));           \
		return false;                                                                                                               \
	}

	inline bool reinitialize_decoder(OpusHandle *handle) {
		if (handle->decoder)
			opus_decoder_destroy(handle->decoder);

		int error = 0;
		INVOKE_OPUS(handle->decoder, opus_decoder_create, 48000, handle->channelCount, &error);
		return true;
	}

    inline bool reinitialize_encoder(OpusHandle *handle) {
	    if (handle->encoder)
		    opus_encoder_destroy(handle->encoder);

	    int error = 0;
	    INVOKE_OPUS(handle->encoder, opus_encoder_create, 48000, handle->channelCount, handle->opusType, &error);
	    INVOKE_OPUS(error, opus_encoder_ctl, handle->encoder, OPUS_SET_COMPLEXITY(1));
	    //INVOKE_OPUS(error, opus_encoder_ctl, handle->encoder, OPUS_SET_BITRATE(4740));

	    EM_ASM(
		    printMessageToServerTab('Encoder initialized!');
		    printMessageToServerTab('  Comprexity: 1');
		    printMessageToServerTab('  Bitrate:    4740');
	    );

        return true;
    }

    EMSCRIPTEN_KEEPALIVE
    OpusHandle* codec_opus_createNativeHandle(size_t channelCount, int type) {
        printf("Initialize opus. (Channel count: %d Sample rate: %d Type: %d)!\n", channelCount, 48000, type);
        auto codec = new OpusHandle{};
	    codec->opusType = type;
	    codec->channelCount = channelCount;
	    if(!reinitialize_decoder(codec)) return nullptr;
	    if(!reinitialize_encoder(codec)) return nullptr;
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
	    auto begin = currentMillies();
        auto result = opus_encode_float(handle->encoder, (float*) buffer, length / handle->channelCount, buffer, maxLength);
        if(result < 0) return result;
	    auto end = currentMillies();
	    EM_ASM({
		           printMessageToServerTab("codec_opus_encode(...) tooks " + $0 + "ms to execute!");
	           }, end - begin);
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
	    if(!reinitialize_decoder(handle)) return 0;
	    if(!reinitialize_encoder(handle)) return 0;
        return 1;
    }
/*
opus_encoder_ctl(enc, OPUS_SET_BITRATE(bitrate));
opus_encoder_ctl(enc, OPUS_SET_COMPLEXITY(complexity));
opus_encoder_ctl(enc, OPUS_SET_SIGNAL(signal_type));
 */
}