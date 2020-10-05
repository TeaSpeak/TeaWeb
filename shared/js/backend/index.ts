import {NativeClientBackend} from "tc-shared/backend/NativeClient";
import {WebClientBackend} from "tc-shared/backend/WebClient";

let backend;
export function getBackend(target: "native") : NativeClientBackend;
export function getBackend(target: "web") : WebClientBackend;

export function getBackend(target) {
    if(__build.target === "client") {
        if(target !== "native") {
            throw "invalid target, expected native";
        }
    } else if(__build.target === "web") {
        if(target !== "web") {
            throw "invalid target, expected web";
        }
    } else {
        throw "invalid/unexpected build target";
    }

    return backend;
}

export function setBackend(instance: NativeClientBackend | WebClientBackend) {
    backend = instance;
}