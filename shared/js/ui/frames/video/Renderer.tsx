import * as React from "react";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {Registry} from "tc-shared/events";
import {
    ChannelVideo,
    ChannelVideoEvents,
    ChannelVideoInfo,
    ChannelVideoStream,
    kLocalVideoId
} from "tc-shared/ui/frames/video/Definitions";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {ClientTag} from "tc-shared/ui/tree/EntryTags";
import ResizeObserver from "resize-observer-polyfill";
import {LogCategory, logWarn} from "tc-shared/log";
import {spawnContextMenu} from "tc-shared/ui/ContextMenu";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";

const EventContext = React.createContext<Registry<ChannelVideoEvents>>(undefined);
const HandlerIdContext = React.createContext<string>(undefined);

const cssStyle = require("./Renderer.scss");

const ExpendArrow = () => {
    const events = useContext(EventContext);

    const [ expended, setExpended ] = useState(() => {
        events.fire("query_expended");
        return false;
    });

    events.reactUse("notify_expended", event => setExpended(event.expended), undefined, [ setExpended ]);

    return (
        <div className={cssStyle.expendArrow} onClick={() => events.fire("action_toggle_expended", { expended: !expended })}>
            <ClientIconRenderer icon={ClientIcon.DoubleArrow} className={cssStyle.icon} />
        </div>
    )
};

const VideoInfo = React.memo((props: { videoId: string }) => {
    const events = useContext(EventContext);
    const handlerId = useContext(HandlerIdContext);

    const localVideo = props.videoId === kLocalVideoId;
    const nameClassList = cssStyle.name + " " + (localVideo ? cssStyle.local : "");

    const [ info, setInfo ] = useState<"loading" | ChannelVideoInfo>(() => {
        events.fire("query_video_info", { videoId: props.videoId });
        return "loading";
    });

    const [ statusIcon, setStatusIcon ] = useState<ClientIcon>(ClientIcon.PlayerOff);

    events.reactUse("notify_video_info", event => {
        if(event.videoId === props.videoId) {
            setInfo(event.info);
            setStatusIcon(event.info.statusIcon);
        }
    });

    events.reactUse("notify_video_info_status", event => {
        if(event.videoId === props.videoId) {
            setStatusIcon(event.statusIcon);
        }
    });

    let clientName;
    if(info === "loading") {
        clientName = <div className={nameClassList} key={"loading"}><Translatable>loading</Translatable> {props.videoId} <LoadingDots /></div>;
    } else {
        clientName = <ClientTag clientName={info.clientName} clientUniqueId={info.clientUniqueId} clientId={info.clientId} handlerId={handlerId} className={nameClassList} key={"loaded"} />;
    }

    return (
        <div className={cssStyle.info}>
            <ClientIconRenderer icon={statusIcon} className={cssStyle.icon} />
            {clientName}
        </div>
    );
});

const VideoStreamReplay = React.memo((props: { stream: MediaStream | undefined, className: string, title: string }) => {
    const refVideo = useRef<HTMLVideoElement>();
    const refReplayTimeout = useRef<number>();

    useEffect(() => {
        const video = refVideo.current;
        if(props.stream) {
            video.style.opacity = "1";
            video.srcObject = props.stream;
            video.autoplay = true;
            video.muted = true;

            const executePlay = () => {
                if(refReplayTimeout.current) {
                    return;
                }

                video.play().then(undefined).catch(() => {
                    logWarn(LogCategory.VIDEO, tr("Failed to start video replay. Retrying in 500ms intervals."));
                    refReplayTimeout.current = setInterval(() => {
                        video.play().then(() => {
                            clearInterval(refReplayTimeout.current);
                            refReplayTimeout.current = undefined;
                        }).catch(() => {});
                    });
                });
            };

            video.onpause = () => {
                logWarn(LogCategory.VIDEO, tr("Video replay paused. Executing play again."));
                executePlay();
            }

            video.onended = () => {
                logWarn(LogCategory.VIDEO, tr("Video replay ended. Executing play again."));
                executePlay();
            }
            executePlay();
        } else {
            video.style.opacity = "0";
        }

        return () => {
            const video = refVideo.current;
            if(video) {
                video.onpause = undefined;
                video.onended = undefined;
            }

            clearInterval(refReplayTimeout.current);
            refReplayTimeout.current = undefined;
        }
    }, [ props.stream ]);

    return (
        <video ref={refVideo} className={cssStyle.video + " " + props.className} title={props.title} />
    )
});

const VideoAvailableRenderer = (props: {  callbackEnable: () => void, callbackIgnore?: () => void, className?: string }) => (
    <div className={cssStyle.text + " " + props.className} key={"video-muted"}>
        <div className={cssStyle.videoAvailable}>
            <Translatable>Video available</Translatable>
            <div className={cssStyle.buttons}>
                <div className={cssStyle.button2} onClick={props.callbackEnable}>
                    <Translatable>Watch</Translatable>
                </div>
                {!props.callbackIgnore ? undefined :
                    <div className={cssStyle.button2} key={"ignore"} onClick={props.callbackIgnore}>
                        <Translatable>Ignore</Translatable>
                    </div>
                }
            </div>
        </div>
    </div>
);

const VideoStreamRenderer = (props: { stream: ChannelVideoStream, callbackEnable: () => void, callbackIgnore: () => void, videoTitle: string, className?: string }) => {
    if(props.stream === "available") {
        return <VideoAvailableRenderer callbackEnable={props.callbackEnable} callbackIgnore={props.callbackIgnore} className={props.className} key={"available"} />;
    } else if(props.stream === undefined) {
        return (
            <div className={cssStyle.text} key={"no-video-stream"}>
                <div><Translatable>No Video</Translatable></div>
            </div>
        );
    } else {
        return <VideoStreamReplay stream={props.stream} className={props.className} title={props.videoTitle} key={"video-renderer"} />;
    }
}

const VideoPlayer = React.memo((props: { videoId: string }) => {
    const events = useContext(EventContext);
    const [ state, setState ] = useState<"loading" | ChannelVideo>(() => {
        events.fire("query_video", { videoId: props.videoId });
        return "loading";
    });

    events.reactUse("notify_video", event => {
        if(event.videoId === props.videoId) {
            setState(event.status);
        }
    });

    if(state === "loading") {
        return (
            <div className={cssStyle.text} key={"info-loading"}>
                <div><Translatable>loading</Translatable> <LoadingDots /></div>
            </div>
        );
    } else if(state.status === "initializing") {
        return (
            <div className={cssStyle.text} key={"info-initializing"}>
                <div><Translatable>connecting</Translatable> <LoadingDots /></div>
            </div>
        );
    } else if(state.status === "error") {
        return (
            <div className={cssStyle.error + " " + cssStyle.text} key={"info-error"}>
                <div>{state.message}</div>
            </div>
        );
    } else if(state.status === "connected") {
        const streamElements = [];
        const streamClasses = [cssStyle.videoPrimary, cssStyle.videoSecondary];

        if(state.desktopStream === "available" && (state.cameraStream === "available" || state.cameraStream === undefined) ||
            state.cameraStream === "available" && (state.desktopStream === "available" || state.desktopStream === undefined)
        ) {
            /* One or both streams are available. Showing just one box. */
            streamElements.push(
                <VideoAvailableRenderer
                    key={"video-available"}
                    callbackEnable={() => {
                        if(state.desktopStream === "available") {
                            events.fire("action_toggle_mute", { broadcastType: "screen", muted: false, videoId: props.videoId })
                        }

                        if(state.cameraStream === "available") {
                            events.fire("action_toggle_mute", { broadcastType: "camera", muted: false, videoId: props.videoId })
                        }
                    }}
                    className={streamClasses.pop_front()}
                />
            );
        } else {
            if(state.desktopStream) {
                if(!state.dismissed["screen"] || state.desktopStream !== "available") {
                    streamElements.push(
                        <VideoStreamRenderer
                            key={"screen"}
                            stream={state.desktopStream}
                            callbackEnable={() => events.fire("action_toggle_mute", { broadcastType: "screen", muted: false, videoId: props.videoId })}
                            callbackIgnore={() => events.fire("action_dismiss", { broadcastType: "screen", videoId: props.videoId })}
                            videoTitle={tr("Screen")}
                            className={streamClasses.pop_front()}
                        />
                    );
                }
            }

            if(state.cameraStream) {
                if(!state.dismissed["camera"] || state.cameraStream !== "available") {
                    streamElements.push(
                        <VideoStreamRenderer
                            key={"camera"}
                            stream={state.cameraStream}
                            callbackEnable={() => events.fire("action_toggle_mute", { broadcastType: "camera", muted: false, videoId: props.videoId })}
                            callbackIgnore={() => events.fire("action_dismiss", { broadcastType: "camera", videoId: props.videoId })}
                            videoTitle={tr("Camera")}
                            className={streamClasses.pop_front()}
                        />
                    );
                }
            }
        }

        if(streamElements.length === 0){
            return (
                <div className={cssStyle.text} key={"no-video-stream"}>
                    <div>
                        {props.videoId === kLocalVideoId ?
                            <Translatable key={"own"}>You're not broadcasting video</Translatable> :
                            <Translatable key={"general"}>No Video</Translatable>
                        }
                    </div>
                </div>
            );
        }

        return <>{streamElements}</>;
    } else if(state.status === "no-video") {
        return (
            <div className={cssStyle.text} key={"no-video"}>
                <div>
                    {props.videoId === kLocalVideoId ?
                        <Translatable key={"own"}>You're not broadcasting video</Translatable> :
                        <Translatable key={"general"}>No Video</Translatable>
                    }
                </div>
            </div>
        );
    }

    return null;
});

const VideoContainer = React.memo((props: { videoId: string, isSpotlight: boolean }) => {
    const events = useContext(EventContext);
    const refContainer = useRef<HTMLDivElement>();
    const fullscreenCapable = "requestFullscreen" in HTMLElement.prototype;

    const [ isFullscreen, setFullscreen ] = useState(false);
    const [ muteState, setMuteState ] = useState<{[T in VideoBroadcastType]: "muted" | "available" | "unset"}>(() => {
        events.fire("query_video_mute_status", { videoId: props.videoId });
        return { camera: "unset", screen: "unset" };
    });

    events.reactUse("notify_video_mute_status", event => {
        if(event.videoId === props.videoId) {
            setMuteState(event.status);
        }
    });

    useEffect(() => {
        if(!isFullscreen) { return; }

        if(document.fullscreenElement !== refContainer.current) {
            setFullscreen(false);
            return;
        }

        const listener = () => {
            if(document.fullscreenElement !== refContainer.current) {
                setFullscreen(false);
            }
        };

        document.addEventListener("fullscreenchange", listener);
        return () => document.removeEventListener("fullscreenchange", listener);
    }, [ isFullscreen ]);

    events.reactUse("action_set_fullscreen", event => {
        if(event.videoId === props.videoId) {
            if(!refContainer.current) { return; }

            refContainer.current.requestFullscreen().then(() => {
                setFullscreen(true);
            }).catch(error => {
                logWarn(LogCategory.GENERAL, tr("Failed to request fullscreen: %o"), error);
            });
        } else {
            if(document.fullscreenElement === refContainer.current) {
                document.exitFullscreen().then(undefined);
            }

            setFullscreen(false);
        }
    });

    const toggleClass = (type: VideoBroadcastType) => {
        if(props.videoId === kLocalVideoId || muteState[type] === "unset") {
            return cssStyle.hidden;
        }

        return muteState[type] === "muted" ? cssStyle.disabled : "";
    }

    return (
        <div
            className={cssStyle.videoContainer}
            onDoubleClick={() => {
                if(isFullscreen) {
                    events.fire("action_set_fullscreen", { videoId: undefined });
                } else if(props.isSpotlight) {
                    events.fire("action_set_fullscreen", { videoId: props.videoId });
                } else {
                    events.fire("action_set_spotlight", { videoId: props.videoId, expend: true });
                    events.fire("action_focus_spotlight", { });
                }
            }}
            onContextMenu={event => {
                event.preventDefault();
                spawnContextMenu({
                    pageY: event.pageY,
                    pageX: event.pageX
                }, [
                    {
                        type: "normal",
                        label: isFullscreen ? tr("Release fullscreen") : tr("Show in fullscreen"),
                        icon: ClientIcon.Fullscreen,
                        click: () => {
                            events.fire("action_set_fullscreen", { videoId: isFullscreen ? undefined : props.videoId });
                        }
                    },
                    {
                        type: "normal",
                        label: props.isSpotlight ? tr("Release spotlight") : tr("Put client in spotlight"),
                        icon: ClientIcon.Fullscreen,
                        click: () => {
                            events.fire("action_set_spotlight", { videoId: props.isSpotlight ? undefined : props.videoId, expend: true });
                            events.fire("action_focus_spotlight", { });
                        }
                    }
                ]);
            }}
            ref={refContainer}
        >
            <VideoPlayer videoId={props.videoId} />
            <VideoInfo videoId={props.videoId} />
            <div className={cssStyle.actionIcons}>
                <div className={cssStyle.iconContainer + " " + cssStyle.toggle + " " + toggleClass("screen")}
                     onClick={() => events.fire("action_toggle_mute", { videoId: props.videoId, broadcastType: "screen", muted: muteState.screen === "available" })}
                     title={muteState["screen"] === "muted" ? tr("Unmute screen video") : tr("Mute screen video")}
                >
                    <ClientIconRenderer className={cssStyle.icon} icon={ClientIcon.ShareScreen} />
                </div>
                <div className={cssStyle.iconContainer + " " + cssStyle.toggle + " " + toggleClass("camera")}
                     onClick={() => events.fire("action_toggle_mute", { videoId: props.videoId, broadcastType: "camera", muted: muteState.camera === "available" })}
                     title={muteState["camera"] === "muted" ? tr("Unmute camera video") : tr("Mute camera video")}
                >
                    <ClientIconRenderer className={cssStyle.icon} icon={ClientIcon.VideoMuted} />
                </div>
                <div className={cssStyle.iconContainer + " " + (!fullscreenCapable ? cssStyle.hidden : "")}
                     onClick={() => {
                         if(props.isSpotlight) {
                             events.fire("action_set_fullscreen", { videoId: isFullscreen ? undefined : props.videoId });
                         } else {
                             events.fire("action_set_spotlight", { videoId: props.videoId, expend: true });
                             events.fire("action_focus_spotlight", { });
                         }
                     }}
                     title={props.isSpotlight ? tr("Toggle fullscreen") : tr("Toggle spotlight")}
                >
                    <ClientIconRenderer className={cssStyle.icon} icon={ClientIcon.Fullscreen} />
                </div>
            </div>
        </div>
    );
});

const VideoBarArrow = React.memo((props: { direction: "left" | "right", containerRef: React.RefObject<HTMLDivElement> }) => {
    const events = useContext(EventContext);
    const [ shown, setShown ] = useState(false);
    events.reactUse("notify_video_arrows", event => setShown(event[props.direction]));

    return (
        <div className={cssStyle.arrow + " " + cssStyle[props.direction] + " " + (shown ? "" : cssStyle.hidden)} ref={props.containerRef}>
            <div className={cssStyle.iconContainer} onClick={() => events.fire("action_video_scroll", { direction: props.direction })}>
                <ClientIconRenderer icon={ClientIcon.SimpleArrow} className={cssStyle.icon} />
            </div>
        </div>
    );
});

const VideoBar = () => {
    const events = useContext(EventContext);
    const refVideos = useRef<HTMLDivElement>();
    const refArrowRight = useRef<HTMLDivElement>();
    const refArrowLeft = useRef<HTMLDivElement>();

    const [ videos, setVideos ] = useState<"loading" | string[]>(() => {
        events.fire("query_videos");
        return "loading";
    });
    events.reactUse("notify_videos", event => setVideos(event.videoIds));

    const updateScrollButtons = useCallback(() => {
        const container = refVideos.current;
        if(!container) { return; }

        const rightEndReached = container.scrollLeft + container.clientWidth + 1 >= container.scrollWidth;
        const leftEndReached = container.scrollLeft <= .9;
        events.fire("notify_video_arrows", { left: !leftEndReached, right: !rightEndReached });
    }, [ refVideos ]);

    events.reactUse("action_video_scroll", event => {
        const container = refVideos.current;
        const arrowLeft = refArrowLeft.current;
        const arrowRight = refArrowRight.current;
        if(container && arrowLeft && arrowRight) {
            const children = [...container.children] as HTMLElement[];
            if(event.direction === "left") {
                const currentCutOff = container.scrollLeft;
                const element = children.filter(element => element.offsetLeft >= currentCutOff)
                    .sort((a, b) => a.offsetLeft - b.offsetLeft)[0];

                container.scrollLeft = (element.offsetLeft + element.clientWidth) - (container.clientWidth - arrowRight.clientWidth);
            } else {
                const currentCutOff = container.scrollLeft + container.clientWidth;
                const element = children.filter(element => element.offsetLeft <= currentCutOff)
                    .sort((a, b) => a.offsetLeft - b.offsetLeft)
                    .last();

                container.scrollLeft = element.offsetLeft - arrowLeft.clientWidth;
            }
        }
        updateScrollButtons();
    }, undefined, [ updateScrollButtons ]);

    useEffect(() => {
        updateScrollButtons();
    }, [ videos ]);

    useEffect(() => {
        const animationRequest = { current: 0 };
        const observer = new ResizeObserver(() => {
            if(animationRequest.current) {
                return;
            }

            animationRequest.current = requestAnimationFrame(() => {
                animationRequest.current = 0;
                updateScrollButtons();
            })
        });
        observer.observe(refVideos.current);
        return () => observer.disconnect();
    }, [ refVideos ]);

    return (
        <div className={cssStyle.videoBar}>
            <div className={cssStyle.videos} ref={refVideos}>
                {videos === "loading" ? undefined :
                    videos.map(videoId => <VideoContainer videoId={videoId} key={videoId} isSpotlight={false} />)
                }
            </div>
            <VideoBarArrow direction={"left"} containerRef={refArrowLeft} />
            <VideoBarArrow direction={"right"} containerRef={refArrowRight} />
        </div>
    )
};

const Spotlight = () => {
    const events = useContext(EventContext);
    const refContainer = useRef<HTMLDivElement>();

    const [ videoId, setVideoId ] = useState<string>(() => {
        events.fire("query_spotlight");
        return undefined;
    });
    events.reactUse("notify_spotlight", event => setVideoId(event.videoId), undefined, []);
    events.reactUse("action_focus_spotlight", () => refContainer.current?.focus(), undefined, []);

    let body;
    if(videoId) {
        body = <VideoContainer videoId={videoId} key={"video-" + videoId} isSpotlight={true} />;
    } else {
        body = (
            <div className={cssStyle.videoContainer} key={"no-video"}>
                <div className={cssStyle.text}><Translatable>No spotlight selected</Translatable></div>
            </div>
        );
    }

    return (
        <div
            className={cssStyle.spotlight}
            onKeyDown={event => {
                if(event.key === "Escape") {
                    events.fire("action_set_spotlight", { videoId: undefined, expend: false });
                }
            }}
            tabIndex={0}
            ref={refContainer}
        >
            {body}
        </div>
    )
};

export const ChannelVideoRenderer = (props: { handlerId: string, events: Registry<ChannelVideoEvents> }) => {
    return (
        <EventContext.Provider value={props.events}>
            <HandlerIdContext.Provider value={props.handlerId}>
                <div className={cssStyle.panel}>
                    <VideoBar />
                    <ExpendArrow />
                    <Spotlight />
                </div>
            </HandlerIdContext.Provider>
        </EventContext.Provider>
    )
};