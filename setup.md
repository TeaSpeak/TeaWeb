
# Environment setup
## Basic system requirements
I used a clean debian jessi docker
```bash
apt-get install git wget gcc make python2.7 xz-utils php5 autoconf libtool zip
```
ATTENTION: Its important to have python2.7 as default `python` command.

## Install java (Required for emscripten)
```bash
apt-get install software-properties-common
add-apt-repository ppa:webupd8team/java
apt-get update
apt-get install oracle-java8-installer
```

## Install cmake (For webassembly and emscripten)
```bash
wget https://cmake.org/files/v3.12/cmake-3.12.3.tar.gz
tar xvf cmake-*.tar.gz
cd cmake-*
./configure
make -j 4
make install
```

## Install nodjs (Later for emscripten too)
```bash
wget https://nodejs.org/dist/v8.12.0/node-v8.12.0-linux-x64.tar.xz
tar xvf node-*.tar.xz
cd node-*
cp -R * /usr/local/
```

## Install emscripten with fastcomp and llvm + clang
### Fastcomp and CLang compiler
```bash
git clone https://github.com/kripken/emscripten-fastcomp
cd emscripten-fastcomp
git clone https://github.com/kripken/emscripten-fastcomp-clang tools/clang
mkdir build; cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD="host;JSBackend" -DLLVM_INCLUDE_EXAMPLES=OFF -DLLVM_INCLUDE_TESTS=OFF -DCLANG_INCLUDE_TESTS=OFF
make -j 4
make install
```
### Emscripten
```bash
git clone https://github.com/kripken/emscripten.git
cd emscripten
python emscripten.py
python emscripten.py #Execute it twice to detekt error
echo "PATH=\"$PATH:`pwd`\"" >> ~/.bashrc
```

# Build TeaWeb
## Close and initialize project
```bash
git clone https://github.com/TeaSpeak/TeaWeb
git submodule update --init --recursive --remote --checkout
```

## Build native libraries
### Opus
```bash
cd asm
./make_opus.sh
```

### Tommath
```bash
cd libraries/tommath
mkdir build; cd build
emcmake cmake ..
emmake make -j 4
```

### Tomcrypt
ATTENTION: Do not create_build.sh!
```bash
cd libraries/tomcrypt
emmake make -f makefile CFLAGS="-DUSE_LTM -DLTM_DESC -I../tommath/" EXTRALIBS="$(pwd)/../tommath/build/libtommathStatic.a" test
```

### Make js files
```bash
cd asm
mkdir build; cd build
emcmake cmake ..
emmake make -j 4
```

# Now generate project structure
```bash
npm install --only=dev
./scripts/build_web_release.sh
./scripts/package_web_release.sh
```