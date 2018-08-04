cmake_minimum_required(VERSION 3.9)
project(TeaWeb-Native)

set (CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_FLAGS_DEBUG "") #Override some config values from the parent project
set(CMAKE_CXX_COMPILER "emcc")
set(CMAKE_C_COMPILER "emcc")
set(CMAKE_C_LINK_EXECUTABLE "emcc")
set(CMAKE_CXX_FLAGS "-O2 --llvm-lto 1 --memory-init-file 0 -s WASM=1") #-s ASSERTIONS=2 -s ALLOW_MEMORY_GROWTH=1 -O3
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_EXE_LINKER_FLAGS "-s EXTRA_EXPORTED_RUNTIME_METHODS='[\"ccall\", \"cwrap\", \"Pointer_stringify\"]'") #
add_definitions(-D_GLIBCXX_USE_CXX11_ABI=0)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/generated/")

include_directories(libraries/tommath/)
include_directories(libraries/tomcrypt/src/headers)
include_directories(libraries/opus/include/)
add_definitions(-DLTM_DESC)

add_executable(TeaWeb-Identity.js identity/Identity.cpp identity/TeamSpeakIdentity.cpp)
target_link_libraries(TeaWeb-Identity.js ${CMAKE_CURRENT_SOURCE_DIR}/libraries/tomcrypt/libtomcrypt.a ${CMAKE_CURRENT_SOURCE_DIR}/libraries/tommath/build/libtommathStatic.a)

add_executable(TeaWeb-Worker-Codec-Opus.js src/opus.cpp)
target_link_libraries(TeaWeb-Worker-Codec-Opus.js ${CMAKE_CURRENT_SOURCE_DIR}/libraries/opus/.libs/libopus.a)
