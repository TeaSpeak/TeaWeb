import {LogCategory, logError, logWarn} from "tc-shared/log";
import { tr } from "tc-shared/i18n/localize";
import {getAudioBackend} from "tc-shared/audio/Player";
import {SoundBackend, SoundFile} from "tc-shared/audio/Sounds";

interface SoundEntry {
    cached?: AudioBuffer;
    node?: HTMLAudioElement;
}

const error_already_handled = "---- error handled ---";

const file_cache: {[key: string]: Promise<SoundEntry> & { timestamp: number }} = {};
let warned = false;

function getSongEntry(file: SoundFile) : Promise<SoundEntry> {
    if(typeof file_cache[file.path] === "object") {
        return new Promise<SoundEntry>((resolve, reject) => {
            if(file_cache[file.path].timestamp + 60 * 1000 > Date.now()) {
                file_cache[file.path].then(resolve).catch(reject);
                return;
            }

            const original_timestamp = Date.now();
            return file_cache[file.path].catch(error => {
                if(file_cache[file.path].timestamp + 60 * 1000 > original_timestamp)
                    return Promise.reject(error);
                delete file_cache[file.path];
                return getSongEntry(file);
            });
        });
    }

    const context = getAudioBackend().getAudioContext();
    if(!context) throw tr("audio context not initialized");

    return (file_cache[file.path] = Object.assign((async () => {
        const entry = {} as SoundEntry;
        if(context.decodeAudioData) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', file.path, true);
            xhr.responseType = 'arraybuffer';

            try {
                const result = new Promise((resolve, reject) => {
                    xhr.onload = resolve;
                    xhr.onerror = reject;
                });

                xhr.send();
                await result;

                if (xhr.status != 200)
                    throw "invalid response code (" + xhr.status + ")";

                try {
                    entry.cached = await context.decodeAudioData(xhr.response);
                } catch(error) {
                    logError(LogCategory.AUDIO, error);
                    throw tr("failed to decode audio data");
                }
            } catch(error) {
                logError(LogCategory.AUDIO, tr("Failed to load audio file %s. Error: %o"), file, error);
                throw error_already_handled;
            }
        } else {
            if(!warned) {
                warned = true;
                logWarn(LogCategory.AUDIO, tr("Your browser does not support decodeAudioData! Using a node to playback! This bypasses the audio output and volume regulation!"));
            }
            const container = $("#sounds");
            const node = $.spawn("audio").attr("src", file.path);
            node.appendTo(container);

            entry.node = node[0];
        }
        return entry;
    })(), { timestamp: Date.now() }));
}

async function replaySound(file: SoundFile) : Promise<void> {
    const entry = getSongEntry(file);
    if(!entry) {
        logWarn(LogCategory.AUDIO, tr("Failed to replay sound %s because it could not be resolved."), file.path);
        return;
    }

    try {
        const sound = await entry;

        if(sound.cached) {
            const context = getAudioBackend().getAudioContext();
            if(!context) throw tr("audio context not initialized (this error should never show up!)");

            const player = context.createBufferSource();
            player.buffer = sound.cached;
            player.start(0);

            const play_promise = new Promise(resolve => player.onended = resolve);
            if(file.volume != 1 && context.createGain) {
                const gain = context.createGain();
                if(gain.gain.setValueAtTime)
                    gain.gain.setValueAtTime(file.volume, 0);
                else
                    gain.gain.value = file.volume;

                player.connect(gain);
                gain.connect(context.destination);
            } else {
                player.connect(context.destination);
            }

            await play_promise;
        } else if(sound.node) {
            sound.node.currentTime = 0;
            await sound.node.play();
        } else {
            throw "missing playback handle";
        }
    } catch(error) {
        if(error === error_already_handled) {
            logWarn(LogCategory.AUDIO, tr("Failed to replay sound %s because of an error while loading (see log above)."), file.path);
            return;
        }

        logWarn(LogCategory.AUDIO, tr("Failed to replay sound %s: %o"), file.path, error);
        return;
    }
}

export class WebSoundBackend implements SoundBackend {
    playSound(sound: SoundFile): Promise<void> {
        return replaySound(sound);
    }

}