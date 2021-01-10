import * as React from "react";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {Registry} from "tc-shared/events";
import {
    ChannelVideoEvents,
    ChannelVideoInfo,
    ChannelVideoStreamState,
    kLocalVideoId,
    makeVideoAutoplay,
    VideoStreamState,
    VideoSubscribeInfo
} from "tc-shared/ui/frames/video/Definitions";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {ClientTag} from "tc-shared/ui/tree/EntryTags";
import ResizeObserver from "resize-observer-polyfill";
import {LogCategory, logWarn} from "tc-shared/log";
import {spawnContextMenu} from "tc-shared/ui/ContextMenu";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";
import {useTr} from "tc-shared/ui/react-elements/Helper";

const SubscribeContext = React.createContext<VideoSubscribeInfo>(undefined);
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

const VideoStreamReplay = React.memo((props: { stream: MediaStream | undefined, className: string, streamType: VideoBroadcastType }) => {
    const refVideo = useRef<HTMLVideoElement>();

    useEffect(() => {
        let cancelAutoplay;
        const video = refVideo.current;
        if(props.stream) {
            video.style.opacity = "1";
            video.srcObject = props.stream;
            video.muted = true;
            cancelAutoplay = makeVideoAutoplay(video);
        } else {
            video.style.opacity = "0";
        }

        return () => {
            const video = refVideo.current;
            if(video) {
                video.onpause = undefined;
                video.onended = undefined;
            }

            if(cancelAutoplay) {
                cancelAutoplay();
            }
        }
    }, [ props.stream ]);

    let title;
    if(props.streamType === "camera") {
        title = useTr("Camera");
    } else {
        title = useTr("Screen");
    }

    return (
        <video ref={refVideo} className={cssStyle.video + " " + props.className} title={title} x-stream-type={props.streamType} />
    )
});

const VideoSubscribeContextProvider = (props: { children?: React.ReactElement | React.ReactElement[] }) => {
    const events = useContext(EventContext);

    const [ subscribeInfo, setSubscribeInfo ] = useState<VideoSubscribeInfo>(() => {
        events.fire("query_subscribe_info");
        return {
            totalSubscriptions: 0,
            subscribedStreams: {
                screen: 0,
                camera: 0
            },
            subscribeLimits: {},
            maxSubscriptions: undefined
        };
    });
    events.reactUse("notify_subscribe_info", event => setSubscribeInfo(event.info));

    return (
        <SubscribeContext.Provider value={subscribeInfo}>
            {props.children}
        </SubscribeContext.Provider>
    );
}

const canSubscribe = (subscribeInfo: VideoSubscribeInfo, target: VideoBroadcastType) : boolean => {
    if(typeof subscribeInfo.maxSubscriptions === "number" && subscribeInfo.maxSubscriptions <= subscribeInfo.totalSubscriptions) {
        return false;
    }

    return typeof subscribeInfo.subscribeLimits[target] !== "number" || subscribeInfo.subscribeLimits[target] > subscribeInfo.subscribedStreams[target];
};

const VideoGeneralAvailableRenderer = (props: { videoId: string, haveScreen: boolean, haveCamera: boolean, className?: string }) => {
    const events = useContext(EventContext);

    const subscribeInfo = useContext(SubscribeContext);
    if(props.haveCamera && canSubscribe(subscribeInfo, "camera") || props.haveScreen && canSubscribe(subscribeInfo, "screen")) {
        return (
            <div className={cssStyle.text + " " + props.className} key={"video-muted"}>
                <div className={cssStyle.videoAvailable}>
                    <Translatable>Video available</Translatable>
                    <div className={cssStyle.buttons}>
                        <div className={cssStyle.button2} onClick={() => events.fire("action_toggle_mute", { videoId: props.videoId, broadcastType: undefined, muted: false })}>
                            <Translatable>Watch</Translatable>
                        </div>
                    </div>
                </div>
            </div>
        );
    } else {
        return (
            <div className={cssStyle.text + " " + props.className} key={"limit-reached"}>
                <div className={cssStyle.videoAvailable}>
                    <Translatable>Stream subscribe limit reached</Translatable>
                    {/* TODO: Name the failed permission */}
                </div>
            </div>
        );
    }
};

const VideoStreamAvailableRenderer = (props: { videoId: string, mode: VideoBroadcastType , className?: string }) => {
    const events = useContext(EventContext);

    const subscribeInfo = useContext(SubscribeContext);
    if(canSubscribe(subscribeInfo, props.mode)) {
        return (
            <div className={cssStyle.text + " " + props.className} key={"video-muted"}>
                <div className={cssStyle.videoAvailable}>
                    <Translatable>Video available</Translatable>
                    <div className={cssStyle.buttons}>
                        <div className={cssStyle.button2} onClick={() => events.fire("action_toggle_mute", { videoId: props.videoId, broadcastType: props.mode, muted: false })}>
                            <Translatable>Watch</Translatable>
                        </div>
                        <div className={cssStyle.button2} key={"ignore"} onClick={() => events.fire("action_dismiss", { videoId: props.videoId, broadcastType: props.mode })}>
                            <Translatable>Ignore</Translatable>
                        </div>
                    </div>
                </div>
            </div>
        );
    } else {
        return (
            <div className={cssStyle.text + " " + props.className} key={"limit-reached"}>
                <div className={cssStyle.videoAvailable}>
                    <Translatable>Stream subscribe limit reached</Translatable>
                    {/* TODO: Name the failed permission */}
                </div>
            </div>
        );
    }
};

const VideoStreamRenderer = (props: { videoId: string, streamType: VideoBroadcastType, className?: string }) => {
    const events = useContext(EventContext);
    const [ state, setState ] = useState<VideoStreamState>(() => {
        events.fire("query_video_stream", { videoId: props.videoId, broadcastType: props.streamType });
        return {
            state: "disconnected",
        }
    });
    events.reactUse("notify_video_stream", event => {
        if(event.videoId === props.videoId && event.broadcastType === props.streamType) {
            setState(event.state);
        }
    });

    switch (state.state) {
        case "disconnected":
            return (
                <div className={cssStyle.text} key={"no-video-stream"}>
                    <div><Translatable>No video stream</Translatable></div>
                </div>
            );

        case "connecting":
            return (
                <div className={cssStyle.text} key={"info-initializing"}>
                    <div><Translatable>connecting</Translatable> <LoadingDots /></div>
                </div>
            );

        case "connected":
            return <VideoStreamReplay stream={state.stream} className={props.className} streamType={props.streamType} key={"connected"} />;

        case "failed":
            return (
                <div className={cssStyle.text + " " + cssStyle.error} key={"error"}>
                    <div><Translatable>Stream replay failed</Translatable></div>
                </div>
            );

        case "available":
            return (
                <div className={cssStyle.text} key={"no-video-stream"}>
                    <div><Translatable>Video available</Translatable></div>
                </div>
            );
    }
}

const VideoPlayer = React.memo((props: { videoId: string, cameraState: ChannelVideoStreamState, screenState: ChannelVideoStreamState }) => {
    const streamElements = [];
    const streamClasses = [cssStyle.videoPrimary, cssStyle.videoSecondary];

    if(props.cameraState === "none" && props.screenState === "none") {
        /* No video available. Will be handled bellow */
    } else if(props.cameraState !== "streaming" && props.screenState !== "streaming") {
        /* We're not streaming any video nor we don't have any video. Show general show video button. */
        streamElements.push(
            <VideoGeneralAvailableRenderer
                key={"video-available"}
                videoId={props.videoId}
                haveCamera={props.cameraState !== "none"}
                haveScreen={props.screenState !== "none"}
                className={streamClasses.pop_front()}
            />
        );
    } else {
        if(props.screenState === "available") {
            streamElements.push(
                <VideoStreamAvailableRenderer
                    key={"video-available-screen"}
                    videoId={props.videoId}
                    mode={"screen"}
                    className={streamClasses.pop_front()}
                />
            );
        } else if(props.screenState === "streaming") {
            streamElements.push(
                <VideoStreamRenderer key={"stream-screen"} videoId={props.videoId} streamType={"screen"} className={streamClasses.pop_front()} />
            );
        }


        if(props.cameraState === "available") {
            streamElements.push(
                <VideoStreamAvailableRenderer
                    key={"video-available-camera"}
                    videoId={props.videoId}
                    mode={"camera"}
                    className={streamClasses.pop_front()}
                />
            );
        } else if(props.cameraState === "streaming") {
            streamElements.push(
                <VideoStreamRenderer key={"stream-camera"} videoId={props.videoId} streamType={"camera"} className={streamClasses.pop_front()} />
            );
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
});

const VideoControlButtons = React.memo((props: {
    videoId: string,
    cameraState: ChannelVideoStreamState,
    screenState: ChannelVideoStreamState,
    isSpotlight: boolean,
    fullscreenMode: "none" | "unavailable" | "set"
}) => {
    const events = useContext(EventContext);

    const screenShown = props.screenState !== "none" && props.videoId !== kLocalVideoId;
    const cameraShown = props.cameraState !== "none" && props.videoId !== kLocalVideoId;

    const screenDisabled = props.screenState === "ignored" || props.screenState === "available";
    const cameraDisabled = props.cameraState === "ignored" || props.cameraState === "available";

    return (
        <div className={cssStyle.actionIcons}>
            <div className={cssStyle.iconContainer + " " + cssStyle.toggle + " " + (screenShown ? "" : cssStyle.hidden) + " " + (screenDisabled ? cssStyle.disabled : "")}
                 onClick={() => events.fire("action_toggle_mute", { videoId: props.videoId, broadcastType: "screen", muted: !screenDisabled })}
                 title={screenDisabled ? tr("Unmute screen video") : tr("Mute screen video")}
            >
                <ClientIconRenderer className={cssStyle.icon} icon={ClientIcon.ShareScreen} />
            </div>
            <div className={cssStyle.iconContainer + " " + cssStyle.toggle + " " + (cameraShown ? "" : cssStyle.hidden) + " " + (cameraDisabled ? cssStyle.disabled : "")}
                 onClick={() => events.fire("action_toggle_mute", { videoId: props.videoId, broadcastType: "camera", muted: !cameraDisabled })}
                 title={cameraDisabled ? tr("Unmute camera video") : tr("Mute camera video")}
            >
                <ClientIconRenderer className={cssStyle.icon} icon={ClientIcon.VideoMuted} />
            </div>
            <div className={cssStyle.iconContainer + " " + (props.fullscreenMode === "unavailable" ? cssStyle.hidden : "")}
                 onClick={() => {
                     if(props.isSpotlight) {
                         events.fire("action_set_fullscreen", { videoId: props.fullscreenMode === "set" ? undefined : props.videoId });
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
    );
});

const VideoContainer = React.memo((props: { videoId: string, isSpotlight: boolean }) => {
    const events = useContext(EventContext);
    const refContainer = useRef<HTMLDivElement>();
    const fullscreenCapable = "requestFullscreen" in HTMLElement.prototype;

    const [ isFullscreen, setFullscreen ] = useState(false);

    const [ cameraState, setCameraState ] = useState<ChannelVideoStreamState>("none");
    const [ screenState, setScreenState ] = useState<ChannelVideoStreamState>(() => {
        events.fire("query_video", { videoId: props.videoId });
        return "none";
    });

    events.reactUse("notify_video", event => {
        if(event.videoId === props.videoId) {
            setCameraState(event.cameraStream);
            setScreenState(event.screenStream);
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
                const streamType = (event.target as HTMLElement).getAttribute("x-stream-type");

                event.preventDefault();
                spawnContextMenu({
                    pageY: event.pageY,
                    pageX: event.pageX
                }, [
                    {
                        type: "normal",
                        label: tr("Popout Video"),
                        icon: ClientIcon.Fullscreen,
                        click: () => {
                            events.fire("action_set_pip", { videoId: props.videoId, broadcastType: streamType as any });
                        },
                        visible: !!streamType && "requestPictureInPicture" in HTMLVideoElement.prototype
                    },
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
            <VideoPlayer videoId={props.videoId} cameraState={cameraState} screenState={screenState} />
            <VideoInfo videoId={props.videoId} />
            <VideoControlButtons
                videoId={props.videoId}
                cameraState={cameraState}
                screenState={screenState}
                isSpotlight={props.isSpotlight}
                fullscreenMode={fullscreenCapable ? isFullscreen ? "set" : "none" : "unavailable"}
            />
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
                    videos.map(videoId => (
                        <ErrorBoundary key={videoId}>
                            <VideoContainer videoId={videoId} isSpotlight={false} />
                        </ErrorBoundary>
                    ))
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
                    <VideoSubscribeContextProvider>
                        <VideoBar />
                        <ExpendArrow />
                        <ErrorBoundary>
                            <Spotlight />
                        </ErrorBoundary>
                    </VideoSubscribeContextProvider>
                </div>
            </HandlerIdContext.Provider>
        </EventContext.Provider>
    );
};