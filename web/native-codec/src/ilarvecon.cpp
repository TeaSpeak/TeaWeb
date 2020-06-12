//
// Created by WolverinDEV on 12/06/2020.
//

/* source and target should not be intersecting! */
template <size_t kChannelCount>
void sequenced2interleaved(float* source, float* target, size_t sample_count) {
    #pragma unroll
    for(size_t channel = 0; channel < kChannelCount; channel++) {
        auto src_ptr = source + channel * sample_count;
        auto dest_ptr = target + channel;

        auto samples_left = sample_count;
        while(samples_left--) {
            *dest_ptr = *src_ptr;

            src_ptr++;
            dest_ptr += kChannelCount;
        }
    }
}

/* source and target should not be intersecting! */
template <size_t kChannelCount>
void interleaved2sequenced(float* source, float* target, size_t sample_count) {
    #pragma unroll
    for(size_t channel = 0; channel < kChannelCount; channel++) {
        auto src_ptr = source + channel;
        auto dest_ptr = target + channel * sample_count;

        auto samples_left = sample_count;
        while(samples_left--) {
            *dest_ptr = *src_ptr;

            src_ptr += kChannelCount;
            dest_ptr++;
        }
    }
}

#define kTempBufferSize (1024 * 8)

/* since js is single threaded we need no lock here */
float temp_buffer[kTempBufferSize];

template <size_t kChannelCount>
void interleaved2sequenced_intersecting(float* buffer, size_t sample_count) {
    auto temp = temp_buffer;
    if(sample_count * kChannelCount > kTempBufferSize)
        temp = (float*) malloc(sample_count * sizeof(float) * kChannelCount);

    memcpy(temp, buffer, sample_count * sizeof(float) * kChannelCount);
    interleaved2sequenced<kChannelCount>(temp, buffer, sample_count);
    if(temp != temp_buffer)
        free(temp);
}

template <size_t kChannelCount>
void sequenced2interleaved_intersecting(float* buffer, size_t sample_count) {
    auto temp = temp_buffer;
    if(sample_count * kChannelCount > kTempBufferSize)
        temp = (float*) malloc(sample_count * sizeof(float) * kChannelCount);

    memcpy(temp, buffer, sample_count * sizeof(float) * kChannelCount);
    sequenced2interleaved<kChannelCount>(temp, buffer, sample_count);
    if(temp != temp_buffer)
        free(temp);
}