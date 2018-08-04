#!/usr/bin/env bash

if ! [ -d generated ]; then
	mkdir generated
fi
OPUS_FN="'_free','_malloc','_opus_strerror','_opus_get_version_string','_opus_encoder_get_size','_opus_encoder_init','_opus_encode','_opus_encode_float','_opus_encoder_ctl','_opus_decoder_get_size','_opus_decoder_init','_opus_decode','_opus_decode_float','_opus_decoder_ctl','_opus_packet_get_nb_samples'"
cd libraries/opus/

git checkout v1.1.2
./autogen.sh
emconfigure ./configure --disable-extra-programs --disable-doc --disable-rtcd
emmake make
cd ../../
emcc -o generated/libopus.js -O3 --memory-init-file 0 --closure 1 -s NO_FILESYSTEM=1 -s MODULARIZE=1 -s EXPORTED_FUNCTIONS="[$OPUS_FN]" libraries/opus/.libs/libopus.a

