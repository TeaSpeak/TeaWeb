cmake_minimum_required(VERSION 3.9)
project(TeaWeb-Native)

set (CMAKE_CXX_STANDARD 17)


function(import_opus)
    # Native SIMD isn't supported yet by most browsers (only experimental)
    # But since opus already detects if emscripten is able to handle SIMD we have no need to disable this explicitly

    # Disable the math.h warning spam:
    # #warning "Don't have the functions lrint() and lrintf ()."
    # #warning "Replacing these functions with a standard C cast."
    set(CMAKE_C_FLAGS "-Wno-#warnings")
    set(OPUS_STACK_PROTECTOR OFF CACHE BOOL "" FORCE)
    add_subdirectory(libraries/opus/)
endfunction()
import_opus()

set(CMAKE_CXX_FLAGS "-O3 --llvm-lto 1 --memory-init-file 0 -s WASM=1 -s ASSERTIONS=1") # -s ALLOW_MEMORY_GROWTH=1 -O3
set(CMAKE_EXE_LINKER_FLAGS "-s EXPORTED_FUNCTIONS='[\"_malloc\", \"_free\"]' -s EXTRA_EXPORTED_RUNTIME_METHODS='[\"ccall\", \"cwrap\"]' -s ENVIRONMENT='worker' --pre-js ${CMAKE_SOURCE_DIR}/init.js") #
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/generated/")

add_executable(TeaWeb-Worker-Codec-Opus src/opus.cpp)
target_link_libraries(TeaWeb-Worker-Codec-Opus opus)
