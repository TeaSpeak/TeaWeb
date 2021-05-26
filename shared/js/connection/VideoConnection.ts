import {VideoSource} from "tc-shared/video/VideoSource";
import {Registry} from "tc-shared/events";
import {ConnectionStatistics} from "tc-shared/connection/ConnectionBase";

export type VideoBroadcastType = "camera" | "screen";

export type VideoBroadcastStatistics = {
    dimensions: { width: number, height: number },
    frameRate: number,

    codec: { name: string, payloadType: number }

    maxBandwidth: number,
    bandwidth: number,

    qualityLimitation: "cpu" | "bandwidth",

    source: {
        frameRate: number,
        dimensions: { width: number, height: number },
    }
};

export interface VideoConnectionEvent {
    notify_status_changed: { oldState: VideoConnectionStatus, newState: VideoConnectionStatus },
}

export enum VideoConnectionStatus {
    /** We're currently not connected to the target server */
    Disconnected,
    /** We're trying to connect to the target server */
    Connecting,
    /** We're connected */
    Connected,
    /** The connection has failed for the current server connection */
    Failed,
    /** Video connection is not supported (the server dosn't support it) */
    Unsupported
}

export enum VideoBroadcastState {
    Stopped,
    Available, /* A stream is available but we've not joined it */
    Initializing,
    Running,
    /* We've a stream but the stream does not replays anything */
    Buffering,
}

export interface VideoClientEvents {
    notify_broadcast_state_changed: { broadcastType: VideoBroadcastType, oldState: VideoBroadcastState, newState: VideoBroadcastState },
    notify_dismissed_state_changed: { broadcastType: VideoBroadcastType, dismissed: boolean },
    notify_broadcast_stream_changed: { broadcastType: VideoBroadcastType }
}

export interface VideoClient {
    getClientId() : number;
    getEvents() : Registry<VideoClientEvents>;

    getVideoState(broadcastType: VideoBroadcastType) : VideoBroadcastState;
    getVideoStream(broadcastType: VideoBroadcastType) : MediaStream;

    joinBroadcast(broadcastType: VideoBroadcastType) : Promise<void>;
    leaveBroadcast(broadcastType: VideoBroadcastType);

    dismissBroadcast(broadcastType: VideoBroadcastType);
    isBroadcastDismissed(broadcastType: VideoBroadcastType) : boolean;

    showPip(broadcastType: VideoBroadcastType) : Promise<void>;
}

export type VideoBroadcastViewer = {
    clientId: number,
    clientName: string,
    clientUniqueId: string,
    clientDatabaseId: number,
};

export interface LocalVideoBroadcastEvents {
    notify_state_changed: { oldState: LocalVideoBroadcastState, newState: LocalVideoBroadcastState },
    notify_clients_joined: { clients: VideoBroadcastViewer[] },
    notify_clients_left: { clientIds: number[] },
}

export type LocalVideoBroadcastState = {
    state: "stopped",
} | {
    state: "initializing"
} | {
    state: "failed",
    reason: string
} | {
    state: "broadcasting"
}

export interface VideoBroadcastConfig {
    /**
     * Ideal and max video width
     */
    width: number,

    /**
     * Ideal and max video height
     */
    height: number,

    /**
     * Dynamically change the video quality related to bandwidth constraints.
     */
    dynamicQuality: boolean,

    /**
     * Max bandwidth which should be used (in bits/second).
     * `0` indicates no bandwidth limit.
     */
    maxBandwidth: number | 0,

    /**
     * Interval of enforcing keyframes.
     * Zero means that no keyframes will be enforced.
     */
    keyframeInterval: number | 0,

    /**
     * Maximal frame rate for the video.
     * This might be ignored by some browsers.
     */
    maxFrameRate: number,

    /**
     * The maximal
     */
    dynamicFrameRate: boolean
}

export interface LocalVideoBroadcast {
    getEvents() : Registry<LocalVideoBroadcastEvents>;

    getState() : LocalVideoBroadcastState;
    getSource() : VideoSource | undefined;
    getStatistics() : Promise<VideoBroadcastStatistics | undefined>;

    //getBandwidthLimit() : number | undefined;
    //setBandwidthLimit(value: number);

    /**
     * @param source The source of the broadcast (No ownership will be taken. The voice connection must ref the source by itself!)
     * @param constraints
     */
    startBroadcasting(source: VideoSource, constraints: VideoBroadcastConfig) : Promise<void>;

    /**
     * @param source The source of the broadcast (No ownership will be taken. The voice connection must ref the source by itself!)
     * @param constraints
     */
    changeSource(source: VideoSource, constraints: VideoBroadcastConfig) : Promise<void>;
    getConstraints() : VideoBroadcastConfig | undefined;

    stopBroadcasting();

    getViewer() : VideoBroadcastViewer[];
}

export interface VideoConnection {
    getEvents() : Registry<VideoConnectionEvent>;

    getStatus() : VideoConnectionStatus;
    getRetryTimestamp() : number | 0;
    getFailedMessage() : string;

    getConnectionStats() : Promise<ConnectionStatistics>;

    getLocalBroadcast(channel: VideoBroadcastType) : LocalVideoBroadcast;

    registerVideoClient(clientId: number);
    registeredVideoClients() : VideoClient[];
    unregisterVideoClient(client: VideoClient);
}