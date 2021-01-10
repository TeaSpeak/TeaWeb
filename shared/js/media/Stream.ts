import {InputStartError} from "tc-shared/voice/RecorderBase";
import {LogCategory, logInfo, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";

export type MediaStreamType = "audio" | "video";

export enum MediaPermissionStatus {
    Unknown,
    Granted,
    Denied
}

/*
export interface MediaStreamEvents {
    notify_permissions_changed: { type: MediaStreamType, newState: MediaPermissionStatus },
}

export const mediaStreamEvents = new Registry<MediaStreamEvents>();
*/

export async function requestMediaStreamWithConstraints(constraints: MediaTrackConstraints, type: MediaStreamType) : Promise<InputStartError | MediaStream> {
    const beginTimestamp = Date.now();
    try {
        logInfo(LogCategory.AUDIO, tr("Requesting a %s stream for device %s in group %s"), type, constraints.deviceId, constraints.groupId);
        return await navigator.mediaDevices.getUserMedia(type === "audio" ? {audio: constraints} : {video: constraints});
    } catch(error) {
        if('name' in error) {
            if(error.name === "NotAllowedError") {
                if(Date.now() - beginTimestamp < 250) {
                    logWarn(LogCategory.AUDIO, tr("Media stream request failed (System denied). Browser message: %o"), error.message);
                    return InputStartError.ESYSTEMDENIED;
                } else {
                    logWarn(LogCategory.AUDIO, tr("Media stream request failed (No permissions). Browser message: %o"), error.message);
                    return InputStartError.ENOTALLOWED;
                }
            } else {
                logWarn(LogCategory.AUDIO, tr("Media stream request failed. Request resulted in error: %o: %o"), error.name, error);
            }
        } else {
            logWarn(LogCategory.AUDIO, tr("Failed to initialize media stream (%o)"), error);
        }

        return InputStartError.EUNKNOWN;
    }
}

/* request permission for devices only one per time! */
let currentMediaStreamRequest: Promise<MediaStream | InputStartError>;
export async function requestMediaStream(deviceId: string | undefined, groupId: string | undefined, type: MediaStreamType) : Promise<MediaStream | InputStartError> {
    /* wait for the current media stream requests to finish */
    while(currentMediaStreamRequest) {
        try {
            await currentMediaStreamRequest;
        } catch(error) { }
    }

    const constrains: MediaTrackConstraints = {};
    if(window.detectedBrowser?.name === "firefox") {
        /*
         * Firefox only allows to open one mic/video as well deciding whats the input device it.
         * It does not respect the deviceId nor the groupId
         */
    } else if(deviceId !== undefined) {
        constrains.deviceId = deviceId;
        constrains.groupId = groupId;
    } else {
        /* Nothing to select. Let the browser select the right device */
    }

    constrains.echoCancellation = true;
    constrains.autoGainControl = true;
    constrains.noiseSuppression = true;

    const promise = (currentMediaStreamRequest = requestMediaStreamWithConstraints(constrains, type));
    try {
        return await currentMediaStreamRequest;
    } finally {
        if(currentMediaStreamRequest === promise) {
            currentMediaStreamRequest = undefined;
        }
    }
}

export async function queryMediaPermissions(type: MediaStreamType, changeListener?: (value: PermissionState) => void) : Promise<PermissionState> {
    if('permissions' in navigator && 'query' in navigator.permissions) {
        try {
            const result = await navigator.permissions.query({ name: type === "audio" ? "microphone" : "camera" });
            if(changeListener) {
                result.addEventListener("change", () => {
                    changeListener(result.state);
                });
            }
            return result.state;
        } catch (error) {
            logWarn(LogCategory.GENERAL, tr("Failed to query for %s permissions: %s"), type, error);
        }
    }
    return "prompt";
}

export function stopMediaStream(stream: MediaStream) {
    stream.getVideoTracks().forEach(track => track.stop());
    stream.getAudioTracks().forEach(track => track.stop());
    if('stop' in stream) {
        (stream as any).stop();
    }
}