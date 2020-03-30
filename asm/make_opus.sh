#!/usr/bin/env bash

cd "$(dirname $0)/libraries/opus/" || { echo "Failed to enter the opus directory."; exit 1; }

[[ -d build_ ]] && {
  rm -r build_ || { echo "failed to remove old build directory"; exit 1; }
}
mkdir build_ || exit 1
cd build_ || exit 1

# Native SIMD isn't supported yet by most browsers (only experimental)
# So there is no need to build with that, it will make stuff even worse
simd_flags="-DOPUS_X86_MAY_HAVE_AVX=OFF -DOPUS_X86_MAY_HAVE_SSE4_1=OFF -DOPUS_X86_MAY_HAVE_SSE2=OFF -DOPUS_X86_MAY_HAVE_SSE=OFF"
emcmake cmake .. -DCMAKE_INSTALL_PREFIX="$(pwd)/../out/" -DOPUS_STACK_PROTECTOR=OFF ${simd_flags} || {
  echo "failed to execute cmake"
  exit 1
}

emmake make || {
  echo "failed to build opus"
  exit 1
}
emmake make install || {
  echo "failed to \"install\" opus"
  exit 1
}

# Old:
#git checkout v1.1.2
#./autogen.sh
#emconfigure ./configure --disable-extra-programs --disable-doc --disable-rtcd
#emmake make