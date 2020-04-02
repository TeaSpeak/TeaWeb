#!/bin/bash

[[ ! -d libraries/opus/out/ ]] && { echo "Missing opus build. Please build it before!"; exit 1; }
[[ ! -f libraries/opus/out/lib/libopus.a ]] && { echo "Missing opus static library. Please unsure your opus build was successfull."; exit 1; }

[[ -d build_ ]] && {
  rm -r build_ || { echo "failed to remove old build directory"; exit 1; }
}
mkdir build_ || exit 1
cd build_ || exit 1

emcmake cmake .. || {
  echo "Failed to execute cmake"
  exit 1
}

emmake make -j"$(nproc --all)" || {
  echo "Failed to build file"
  exit 1
}