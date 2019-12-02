# Attention this guid is currently outdated!
Anyway most of this stuff is still relevant for the web client, just the last few steps may differ


# Build TeaWeb
## General start
Before you start, please ensure that you've successfully set up your environment.  
If you don't want to install all this, you could also use the official web build docker. <url>   


## 1. Clone and initialize project
```bash
git clone https://github.com/TeaSpeak/TeaWeb
git submodule update --init --recursive --remote --checkout
```

## (2.) Build native libraries
As already mentioned, if you're just want to develop or style the web client this isnt required!  
If you want to speak or use TeamSpeak 3 Identities you have to complete this!  
### Opus
#### Native loader
```bash
cd asm
./make_opus.sh
```
#### Javascript loader
```bash
npm run build-worker
```


### Tommath
```bash
cd libraries/tommath
mkdir build; cd build
emcmake cmake ..
emmake make -j 4
```

### Tomcrypt
ATTENTION: Do not use the `create_build.sh` script!
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

## 3. Compiling the typescript and as well the style sheets
```bash
npm install --only=dev  # Install the dependencies
./scripts/web_build.sh dev # Use "rel" insteadof "dev" to create a release build 
```  
You should now find an ready to use environment within `web/environment/development`.  
Please notice that all files are just *relative* links to the files.  

## 4. Create a final package
```bash
./scripts/web_package.sh dev # Use "rel" insteadof "dev" to create a release package
```  

# Environment setup
## Basic system requirements
You need a linux based (ubuntu or debian is recommanded) system.  
As well you need the following packaged installed:  
```bash
apt-get install git wget gcc make python2.7 xz-utils php5 autoconf libtool zip
```
ATTENTION: Its important to have python2.7 as default `python` command.

### Install emscripten
`emscripten` is required for compiling c++ into webassably or even javascript.  
This currently affects the TeamSpeak 3 Identity part and the codec part.  
Just for developing or styling the web client, this isn't required.  
So if you want to save some time you could scrip this.  

#### Install java (Required for emscripten)
```bash
apt-get install software-properties-common
add-apt-repository ppa:webupd8team/java
apt-get update
apt-get install oracle-java8-installer
```

#### Install cmake (For webassembly and emscripten)
```bash
wget https://cmake.org/files/v3.12/cmake-3.12.3.tar.gz
tar xvf cmake-*.tar.gz
cd cmake-*
./configure
make -j 4
make install
```

#### Install nodjs (Later for emscripten too)
```bash
wget https://nodejs.org/dist/v8.12.0/node-v8.12.0-linux-x64.tar.xz
tar xvf node-*.tar.xz
cd node-*
cp -R * /usr/local/
```

#### Install emscripten with fastcomp and llvm + clang
##### Fastcomp and CLang compiler
```bash
git clone https://github.com/kripken/emscripten-fastcomp
cd emscripten-fastcomp
git clone https://github.com/kripken/emscripten-fastcomp-clang tools/clang
mkdir build; cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD="host;JSBackend" -DLLVM_INCLUDE_EXAMPLES=OFF -DLLVM_INCLUDE_TESTS=OFF -DCLANG_INCLUDE_TESTS=OFF
make -j 4
make install
```
##### Emscripten
```bash
git clone https://github.com/kripken/emscripten.git
cd emscripten
python emscripten.py
python emscripten.py #Execute it twice to detekt error
echo "PATH=\"$PATH:`pwd`\"" >> ~/.bashrc
```