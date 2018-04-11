project(TeaWeb-Native)

set(CMAKE_CXX_COMPILER "emcc")
set(CMAKE_C_COMPILER "emcc")
set(CMAKE_C_LINK_EXECUTABLE "emcc")
set(CMAKE_CXX_FLAGS "-s ASSERTIONS=2 -s ALLOW_MEMORY_GROWTH=1") #-s WASM=1 -O2
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_EXE_LINKER_FLAGS "-s EXTRA_EXPORTED_RUNTIME_METHODS='[\"ccall\", \"cwrap\", \"Pointer_stringify\"]'") #
add_definitions(-D_GLIBCXX_USE_CXX11_ABI=0)

add_definitions(-DLTM_DESC)
include_directories(libraries/opus/include/)
include_directories(libraries/tommath/)
include_directories(libraries/tomcrypt/src/headers)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/generated/")
add_executable(TeaWeb-Native.js src/CodecOpus.cpp src/TeamSpeakIdentity.cpp src/Identity.cpp src/INIReader.h)
target_link_libraries(TeaWeb-Native.js ${CMAKE_CURRENT_SOURCE_DIR}/libraries/opus/.libs/libopus.a ${CMAKE_CURRENT_SOURCE_DIR}/libraries/tomcrypt/libtomcrypt.a ${CMAKE_CURRENT_SOURCE_DIR}/libraries/tommath/build/libtommathStatic.a)