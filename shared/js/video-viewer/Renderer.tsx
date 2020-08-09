import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {Registry} from "tc-shared/events";
import {PlayerStatus, VideoViewerEvents} from "./Definitions";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import ReactPlayer from 'react-player'
import {HTMLRenderer} from "tc-shared/ui/react-elements/HTMLRenderer";
import {Button} from "tc-shared/ui/react-elements/Button";

import "tc-shared/file/RemoteAvatars";
import {AvatarRenderer} from "tc-shared/ui/react-elements/Avatar";
import {getGlobalAvatarManagerFactory} from "tc-shared/file/Avatars";
import {Settings, settings} from "tc-shared/settings";
import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";

const iconNavbar = require("./icon-navbar.svg");
const cssStyle = require("./Renderer.scss");

const kLogPlayerEvents = true;

const PlaytimeRenderer = React.memo((props: { time: number }) => {
    const [ revision, setRevision ] = useState(0);
    useEffect(() => {
        const id = setTimeout(() => setRevision(revision + 1), 950);
        return () => clearTimeout(id);
    });

    let seconds = Math.floor((Date.now() - props.time) / 1000);

    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    let minutes = Math.floor(seconds / 60);
    seconds %= 60;

    let time = ("0" + hours).substr(-2) + ":" + ("0" + minutes).substr(-2) + ":" + ("0" + seconds).substr(-2);
    return <>{time}</>;
});

const PlayerStatusRenderer = (props: { status: PlayerStatus | undefined, timestamp: number }) => {
    switch (props.status?.status) {
        case "paused":
            return (<React.Fragment key={"paused"}>
                <Translatable>Replay paused</Translatable>
            </React.Fragment>);

        case "buffering":
            return (<React.Fragment key={"buffering"}>
                <Translatable>Buffering</Translatable>&nbsp;
                <LoadingDots />
            </React.Fragment>);

        case "stopped":
            return (<React.Fragment key={"stopped"}>
                <Translatable>Video ended</Translatable>&nbsp;
                <LoadingDots />
            </React.Fragment>);

        case "playing":
            return (<React.Fragment key={"playing"}>
                <Translatable>Playing</Translatable>&nbsp;
                {props.timestamp === -1 ? undefined : <>(<PlaytimeRenderer key={"time"} time={props.timestamp - props.status.timestampPlay * 1000} />)</>}
            </React.Fragment>);

        case undefined:
            return (<React.Fragment key={"unknown"}>
                <Translatable>loading</Translatable>&nbsp;
                <LoadingDots />
            </React.Fragment>);

        default:
            return (<React.Fragment key={"default"}>
                <Translatable>unknown player status</Translatable> ({(props as any).status?.status})
            </React.Fragment>);
    }
};

const WatcherInfo = React.memo((props: { events: Registry<VideoViewerEvents>, watcherId: string, handlerId: string, isFollowing?: boolean, type: "watcher" | "follower" }) => {
    const [ clientInfo, setClientInfo ] = useState<"loading" | { uniqueId: string, clientId: number, clientName: string, ownClient: boolean }>(() => {
        props.events.fire("query_watcher_status", { watcherId: props.watcherId });
        return "loading";
    });

    const [ status, setStatus ] = useState<PlayerStatus & { timestamp: number }>(() => {
        props.events.fire("query_watcher_info", { watcherId: props.watcherId });
        return undefined;
    });

    let renderedAvatar;
    if(clientInfo === "loading") {
        renderedAvatar = <AvatarRenderer className={cssStyle.avatar} avatar={"loading"} key={"loading-avatar"} />;
    } else {
        const avatar = getGlobalAvatarManagerFactory().getManager(props.handlerId).resolveClientAvatar({ id: clientInfo.clientId, clientUniqueId: clientInfo.uniqueId });
        renderedAvatar = <AvatarRenderer className={cssStyle.avatar} avatar={avatar} key={"client-avatar"} />;
    }

    let renderedClientName;
    if(clientInfo !== "loading") {
        renderedClientName = <React.Fragment key={"client-name"}>{clientInfo.clientName}</React.Fragment>;
    } else {
        renderedClientName = (
            <React.Fragment key={"client-name-loading"}>
                <Translatable>loading</Translatable>&nbsp;
                <LoadingDots />
            </React.Fragment>
        );
    }

    props.events.reactUse("notify_watcher_info", event => {
        if(event.watcherId !== props.watcherId)
            return;

        setClientInfo({ uniqueId: event.clientUniqueId, clientId: event.clientId, clientName: event.clientName, ownClient: event.isOwnClient });
    });

    props.events.reactUse("notify_watcher_status", event => {
        if(event.watcherId !== props.watcherId)
            return;

        if(status?.status === "playing" && event.status.status === "playing") {
            const expectedPlaytime = (Date.now() - status.timestamp) / 1000 + status.timestampPlay;
            const currentPlaytime = event.status.timestampPlay;

            if(Math.abs(expectedPlaytime - currentPlaytime) > 2) {
                setStatus(Object.assign({ timestamp: Date.now() }, event.status));
            } else {
                /* keep the last value, its still close enough */
                setStatus({
                    status: "playing",
                    timestamp: status.timestamp,
                    timestampBuffer: 0,
                    timestampPlay: status.timestampPlay
                });
            }
        } else {
            setStatus(Object.assign({ timestamp: Date.now() }, event.status));
        }
    });

    return (
        <div
            className={cssStyle.info + " " + (clientInfo !== "loading" && clientInfo.ownClient ? cssStyle.ownClient : "") + " " + cssStyle[props.type] + " " + (props.isFollowing ? cssStyle.following : "")}
            onClick={() => {
                if(clientInfo === "loading")
                    return;

                if(clientInfo.ownClient || props.isFollowing)
                    return;

                props.events.fire("action_follow", { watcherId: props.watcherId });
            }}
        >
            <div className={cssStyle.containerAvatar}>
                {renderedAvatar}
            </div>
            <div className={cssStyle.containerDetail}>
                <a className={cssStyle.username}>
                    {renderedClientName}
                </a>
                <a className={cssStyle.status}>
                    <PlayerStatusRenderer status={status} timestamp={status?.timestamp} />
                </a>
            </div>
        </div>
    );
});

const WatcherEntry = React.memo((props: { events: Registry<VideoViewerEvents>, watcherId: string, handlerId: string, isFollowing: boolean }) => {
    return (
        <div className={cssStyle.watcher}>
            <WatcherInfo events={props.events} watcherId={props.watcherId} handlerId={props.handlerId} type={"watcher"} isFollowing={props.isFollowing} />
            <FollowerList events={props.events} watcherId={props.watcherId} handlerId={props.handlerId} />
        </div>
    );
});

const FollowerList = React.memo((props: { events: Registry<VideoViewerEvents>, watcherId: string, handlerId: string }) => {
    const [ followers, setFollowers ] = useState<string[]>(() => {
        props.events.fire("query_followers", { watcherId: props.watcherId });
        return [];
    });

    const [ followerRevision, setFollowerRevision ] = useState(0);

    props.events.reactUse("notify_follower_list", event => {
        if(event.watcherId !== props.watcherId)
            return;

        setFollowers(event.followerIds.slice(0));
    });

    props.events.reactUse("notify_follower_added", event => {
        if(event.watcherId !== props.watcherId)
            return;

        if(followers.indexOf(event.followerId) !== -1)
            return;

        console.error("Added follower");
        followers.push(event.followerId);
        setFollowerRevision(followerRevision + 1);
    });

    props.events.reactUse("notify_follower_removed", event => {
        if(event.watcherId !== props.watcherId)
            return;

        const index = followers.indexOf(event.followerId);
        if(index === -1)
            return;

        console.error("Removed follower");
        followers.splice(index, 1);
        setFollowerRevision(followerRevision + 1);
    });

    return (
        <div className={cssStyle.followerList}>
            {followers.map(followerId => <WatcherInfo key={followerId} events={props.events} watcherId={followerId} handlerId={props.handlerId} type={"follower"} />)}
        </div>
    );
});

const WatcherList = (props: { events: Registry<VideoViewerEvents>, handlerId: string }) => {
    const [ watchers, setWatchers ] = useState<string[]>(() => {
        props.events.fire("query_watchers");
        return [];
    });

    const [ following, setFollowing ] = useState<string | undefined>(undefined);

    props.events.reactUse("notify_watcher_list", event => {
        setWatchers(event.watcherIds.slice(0));
        setFollowing(event.followingWatcher);
    });

    props.events.reactUse("notify_following", event => setFollowing(event.watcherId));

    return (
        <div className={cssStyle.watcherList}>
            {watchers.map(watcherId => <WatcherEntry key={watcherId} events={props.events} handlerId={props.handlerId} isFollowing={watcherId === following} watcherId={watcherId} />)}
        </div>
    );
};

const ToggleSidebarButton = (props: { events: Registry<VideoViewerEvents> }) => {
    const [ visible, setVisible ] = useState(settings.global(Settings.KEY_W2G_SIDEBAR_COLLAPSED));

    props.events.reactUse("action_toggle_side_bar", event => setVisible(!event.shown));

    return (
        <div className={cssStyle.sidebarButton + " " + (visible ? "" : cssStyle.hidden)} onClick={() => props.events.fire("action_toggle_side_bar", { shown: true })}>
            <HTMLRenderer purify={false}>{iconNavbar}</HTMLRenderer>
        </div>
    );
};

const ButtonUnfollow = (props: { events: Registry<VideoViewerEvents> }) => {
    const [ following, setFollowing ] = useState(false);

    props.events.reactUse("notify_following", event => setFollowing(event.watcherId !== undefined));
    props.events.reactUse("notify_watcher_list", event => setFollowing(event.followingWatcher !== undefined));

    return (
        <Button color={"red"} type={"small"} disabled={!following} onClick={() => props.events.fire("action_follow", { watcherId: undefined })}>
            <Translatable>Unfollow</Translatable>
        </Button>
    );
};

const Sidebar = (props: { events: Registry<VideoViewerEvents>, handlerId: string }) => {
    const [ visible, setVisible ] = useState(!settings.global(Settings.KEY_W2G_SIDEBAR_COLLAPSED));

    props.events.reactUse("action_toggle_side_bar", event => setVisible(event.shown));

    return (
        <div className={cssStyle.containerSidebar + " " + (visible ? cssStyle.shown : "")}>
            <div className={cssStyle.buttonClose} onClick={() => props.events.fire("action_toggle_side_bar", { shown: false })} />
            <div className={cssStyle.header}>
                <a><Translatable>Watcher list</Translatable></a>
            </div>
            <WatcherList events={props.events} handlerId={props.handlerId} />
            <div className={cssStyle.buttons}>
                <ButtonUnfollow events={props.events} />
            </div>
        </div>
    )
};

const PlayerController = React.memo((props: { events: Registry<VideoViewerEvents> }) => {
    const player = useRef<ReactPlayer>();

    const [ mode, setMode ] = useState<"watcher" | "follower">("watcher");
    const [ videoUrl, setVideoUrl ] = useState<"querying" | string>(() => {
        props.events.fire_async("query_video");
        return "querying";
    });

    const playerState = useRef<"playing" | "buffering" | "paused" | "stopped">("paused");
    const currentTime = useRef<{ play: number, buffer: number }>({ play: -1, buffer: -1 });

    const [ masterPlayerState, setWatcherPlayerState ] = useState<"playing" | "buffering" | "paused" | "stopped">("stopped");
    const watcherTimestamp = useRef<number>();

    const videoEnded = useRef(false);

    const [ forcePause, setForcePause ] = useState(false);

    props.events.reactUse("notify_following", event => setMode(event.watcherId === undefined ? "watcher" : "follower"));
    props.events.reactUse("notify_watcher_list", event => setMode(event.followingWatcher === undefined ? "watcher" : "follower"));

    props.events.reactUse("notify_following_status", event => {
        if(mode !== "follower")
            return;

        setWatcherPlayerState(event.status.status);
        if(event.status.status === "playing" && player.current) {
            const distance = Math.abs(player.current.getCurrentTime() - event.status.timestampPlay);
            const doSeek = distance > 7;

            log.trace(LogCategory.GENERAL, tr("Follower sync. Remote timestamp %d, Local timestamp: %d. Difference: %d, Do seek: %o"),
                player.current.getCurrentTime(),
                event.status.timestampPlay,
                distance,
                doSeek
            );

            if(doSeek) {
                player.current.seekTo(event.status.timestampPlay, "seconds");
            }

            watcherTimestamp.current = Date.now() - event.status.timestampPlay * 1000;
        }
    });

    props.events.reactUse("notify_video", event => setVideoUrl(event.url));

    useEffect(() => {
        if(forcePause)
            setForcePause(false);
    });

    /* TODO: Some kind of overlay if the video url is loading? */
    return (
        <ReactPlayer
            ref={player}
            key={"player-" + mode}

            url={videoUrl}
            height={"100%"}
            width={"100%"}

            onError={(error, data, hlsInstance, hlsGlobal) => console.log("onError(%o, %o, %o, %o)", error, data, hlsInstance, hlsGlobal)}
            onBuffer={() => {
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onBuffer()"));
                playerState.current = "buffering";
                props.events.fire("notify_local_status", { status: { status: "buffering" } });
            }}

            onBufferEnd={() => {
                if(playerState.current === "buffering")
                    playerState.current = "playing";
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onBufferEnd()"));
            }}

            onDisablePIP={() => { /* console.log("onDisabledPIP()") */ }}
            onEnablePIP={() => { /* console.log("onEnablePIP()") */ }}

            onDuration={duration => {
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onDuration(%d)"), duration);
            }}

            onEnded={() => {
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onEnded()"));
                playerState.current = "stopped";
                props.events.fire("notify_local_status", { status: { status: "stopped" } });

                videoEnded.current = true;
                player.current.seekTo(0, "seconds");
            }}

            onPause={() => {
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onPause()"));

                if(videoEnded.current) {
                    videoEnded.current = false;
                    return;
                }

                playerState.current = "paused";
                props.events.fire("notify_local_status", { status: { status: "paused" } });
            }}

            onPlay={() => {
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onPlay()"));

                if(videoEnded.current) {
                    /* it's just the seek to the beginning */
                    return;
                }

                if(mode === "follower") {
                    if(masterPlayerState !== "playing") {
                        setForcePause(true);
                        return;
                    }

                    const currentSeconds = player.current.getCurrentTime();
                    const expectedSeconds = (Date.now() - watcherTimestamp.current) / 1000;
                    const doSync = Math.abs(currentSeconds - expectedSeconds) > 5;

                    log.debug(LogCategory.GENERAL, tr("Player started, at second %d. Watcher is at %s. So sync: %o"), currentSeconds, expectedSeconds, doSync);
                    doSync && player.current.seekTo(expectedSeconds, "seconds");
                }

                playerState.current = "playing";
                props.events.fire("notify_local_status", { status: { status: "playing", timestampBuffer: currentTime.current.buffer, timestampPlay: currentTime.current.play } });
            }}

            onProgress={state => {
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onProgress %d seconds played, %d seconds buffered. Player state: %s"), state.playedSeconds, state.loadedSeconds, playerState.current);

                currentTime.current = { buffer: state.loadedSeconds, play: state.playedSeconds };
                if(playerState.current !== "playing")
                    return;

                props.events.fire("notify_local_status", {
                    status: {
                        status: "playing",
                        timestampBuffer: Math.floor(state.loadedSeconds),
                        timestampPlay: Math.floor(state.playedSeconds)
                    }
                })
            }}

            onReady={() => {
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onReady()"));
            }}

            onSeek={seconds => {
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onSeek(%d)"), seconds);
            }}

            onStart={() => {
                kLogPlayerEvents && log.trace(LogCategory.GENERAL, tr("ReactPlayer::onStart()"));
            }}

            controls={true}

            loop={false}
            light={false}

            config={{
                youtube: {
                    playerVars: {
                        rel: 0
                    }
                }
            }}
            playing={mode === "watcher" ? undefined : masterPlayerState === "playing" || forcePause}
        />
    );
});

const TitleRenderer = (props: { events: Registry<VideoViewerEvents> }) => {
    const [ followId, setFollowing ] = useState<string>(undefined);
    const [ followingName, setFollowingName ] = useState<string>(undefined);

    props.events.reactUse("notify_following", event => setFollowing(event.watcherId));
    props.events.reactUse("notify_watcher_list", event => setFollowing(event.followingWatcher));
    props.events.reactUse("notify_watcher_info", event => {
        if(event.watcherId !== followId)
            return;

        setFollowingName(event.clientName);
    });

    useEffect(() => {
        if(followingName === undefined && followId)
            props.events.fire("query_watcher_info", { watcherId: followId });
    });

    if(followId && followingName) {
        return <React.Fragment key={"following"}><Translatable enforceTextOnly={true}>W2G - Following</Translatable> {followingName}</React.Fragment>;
    } else {
        return <Translatable key={"watcher"} enforceTextOnly={true}>W2G - Watcher</Translatable>;
    }
};

class ModalVideoPopout extends AbstractModal {
    readonly events: Registry<VideoViewerEvents>;
    readonly handlerId: string;

    constructor(registry: Registry<VideoViewerEvents>, userData: any) {
        super();

        this.handlerId = userData.handlerId;
        this.events = registry;
    }

    title(): string | React.ReactElement<Translatable> {
        return <TitleRenderer events={this.events} />;
    }

    renderBody(): React.ReactElement {
        return <div className={cssStyle.container} >
            <Sidebar events={this.events} handlerId={this.handlerId} />
            <ToggleSidebarButton events={this.events} />
            <div className={cssStyle.containerPlayer}>
                <PlayerController events={this.events} />
            </div>
        </div>;
    }
}

export = ModalVideoPopout;