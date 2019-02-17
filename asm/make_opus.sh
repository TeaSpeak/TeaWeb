#!/usr/bin/env bash

base_dir=`pwd`
cd "$(dirname $0)/libraries/opus/"

git checkout v1.1.2
./autogen.sh
emconfigure ./configure --disable-extra-programs --disable-doc --disable-rtcd
emmake make

cd ${base_dir}