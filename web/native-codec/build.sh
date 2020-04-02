#!/bin/bash

cd "$(dirname "$0")" || { echo "Failed to enter base dir"; exit 1; }
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