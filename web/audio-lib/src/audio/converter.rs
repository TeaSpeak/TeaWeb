#![allow(dead_code)]

/* source and target should not be intersecting! */
pub fn sequenced2interleaved(src: &[f32], dest: &mut [f32], sample_count: u32, channel_count: u32) {
    for channel in 0..channel_count {
        let mut source_index  = (channel * sample_count) as usize;
        let mut dest_index = channel as usize;

        for _ in 0..sample_count {
            dest[dest_index] = src[source_index];

            source_index += 1 as usize;
            dest_index += channel_count as usize;
        }
    }
}

/* source and target should not be intersecting! */
pub fn interleaved2sequenced(src: &[f32], dest: &mut [f32], sample_count: u32, channel_count: u32) {
    for channel in 0..channel_count {
        let mut source_index = channel as usize;
        let mut dest_index  = (channel * sample_count) as usize;

        for _ in 0..sample_count {
            dest[dest_index] = src[source_index];

            source_index += channel_count as usize;
            dest_index += 1 as usize;
        }
    }
}