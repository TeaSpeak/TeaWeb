import * as lib from "tc-backend/audio-lib/index";

export type AudioLibrary = (typeof lib) & {
    memory: WebAssembly.Memory
}

export function getAudioLibraryInstance() : Promise<AudioLibrary>;