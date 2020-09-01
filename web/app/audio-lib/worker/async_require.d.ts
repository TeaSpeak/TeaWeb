import * as lib from "../../../audio-lib/pkg/index";

export type AudioLibrary = (typeof lib) & {
    memory: WebAssembly.Memory
}

export function getAudioLibraryInstance() : Promise<AudioLibrary>;