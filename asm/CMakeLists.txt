project(TeaWeb-Native)

set(CMAKE_CXX_COMPILER "emcc")
set(CMAKE_C_COMPILER "emcc")
set(CMAKE_C_LINK_EXECUTABLE "emcc")
#set(CMAKE_CXX_FLAGS "-s WASM=1")
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_EXE_LINKER_FLAGS "-s EXTRA_EXPORTED_RUNTIME_METHODS='[\"ccall\", \"cwrap\"]'") #

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/generated/")
add_executable(TeaWeb-Native.js src/WebASMTest.cpp)
target_link_libraries(TeaWeb-Native.js ${CMAKE_CURRENT_SOURCE_DIR}/libs/opus/.libs/libopus.a)
#Adding directories to PATH:
#PATH += /home/wolverindev/wgit/emscripten-sdk

#Setting environment variables:
#EMSDK = /home/wolverindev/wgit/emscripten-sdk
#EM_CONFIG = /home/wolverindev/.emscripten
