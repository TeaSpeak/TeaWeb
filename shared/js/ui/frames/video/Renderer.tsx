import * as React from "react";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {Registry} from "tc-shared/events";
import {
    ChannelVideoEvents, ChannelVideoInfo,
    ChannelVideoStreamState, getVideoStreamMap,
    kLocalVideoId, makeVideoAutoplay,
    VideoStreamState,
    VideoSubscribeInfo
} from "./Definitions";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import ResizeObserver from "resize-observer-polyfill";
import {LogCategory, logTrace, logWarn} from "tc-shared/log";
import {spawnContextMenu} from "tc-shared/ui/ContextMenu";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import {Spotlight, SpotlightDimensions, SpotlightDimensionsContext} from "./RendererSpotlight";
import * as _ from "lodash";
import {ClientTag} from "tc-shared/ui/tree/EntryTags";
import {tra} from "tc-shared/i18n/localize";


const SubscribeContext = React.createContext<VideoSubscribeInfo>(undefined);
const EventContext = React.createContext<Registry<ChannelVideoEvents>>(undefined);
const HandlerIdContext = React.createContext<string>(undefined);
export const VideoIdContext = React.createContext<string>(undefined);

export const RendererVideoEventContext = EventContext;

const cssStyle = require("./Renderer.scss");

const ExpendArrow = React.memo(() => {
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
    );
});

const VideoViewerCount = React.memo(() => {
    const videoId = useContext(VideoIdContext);
    const events = useContext(EventContext);
    if(videoId !== kLocalVideoId) {
        /* Currently one we can see our own video viewer */
        return null;
    }

    const [ viewer, setViewer ] = useState<{ camera: number | undefined, screen: number | undefined }>(() => {
        events.fire("query_viewer_count");
        return { screen: undefined, camera: undefined };
    });

    events.reactUse("notify_viewer_count", event => setViewer({ camera: event.camera, screen: event.screen }));

    let info = [];
    if(typeof viewer.camera === "number") {
        info.push(
            <div className={cssStyle.entry} key={"camera"} title={tra("{} Camera viewers", viewer.camera)}>
                <div className={cssStyle.value}>{viewer.camera}</div>
                <ClientIconRenderer icon={ClientIcon.VideoMuted} className={cssStyle.icon} />
            </div>
        );
    }

    if(typeof viewer.screen === "number") {
        info.push(
            <div className={cssStyle.entry} key={"screen"} title={tra("{} Screen viewers", viewer.screen)}>
                <div className={cssStyle.value}>{viewer.screen}</div>
                <ClientIconRenderer icon={ClientIcon.ShareScreen} className={cssStyle.icon} />
            </div>
        );
    }

    if(info.length === 0) {
        /* We're not streaming any video */
        return null;
    }

    return (
        <div
            className={cssStyle.videoViewerCount}
            onClick={() => events.fire("action_show_viewers")}
            onDoubleClick={event => event.preventDefault()}
        >
            {info}
        </div>
    )
});

const VideoClientInfo = React.memo((props: { videoId: string }) => {
    const events = useContext(EventContext);
    const handlerId = useContext(HandlerIdContext);

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
        clientName = (
            <div className={cssStyle.name} key={"loading"}>
                <Translatable>loading</Translatable> {props.videoId} <LoadingDots />
            </div>
        );
    } else {
        clientName = <ClientTag clientName={info.clientName} clientUniqueId={info.clientUniqueId} clientId={info.clientId} handlerId={handlerId} className={cssStyle.name} key={"loaded"} />;
    }

    return (
        <div className={joinClassList(cssStyle.info, props.videoId === kLocalVideoId && cssStyle.local)}>
            <ClientIconRenderer icon={statusIcon} className={cssStyle.icon} />
            {clientName}
        </div>
    );
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
    if((props.haveCamera && canSubscribe(subscribeInfo, "camera")) || (props.haveScreen && canSubscribe(subscribeInfo, "screen"))) {
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

const MediaStreamVideoRenderer = React.memo((props: { stream: MediaStream | undefined, className: string, title: string }) => {
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

    return (
        <video ref={refVideo} className={cssStyle.video + " " + props.className} title={props.title} />
    )
});

const VideoStreamPlayer = React.memo((props: { videoId: string, streamType: VideoBroadcastType, className?: string }) => {
    const events = useContext(EventContext);
    const [ state, setState ] = useState<VideoStreamState>(() => {
        events.fire("query_video_stream", { videoId: props.videoId, broadcastType: props.streamType });
        return { state: "disconnected", }
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
                    <div>
                        <Translatable>No video stream</Translatable>
                    </div>
                </div>
            );

        case "connecting":
            return (
                <div className={cssStyle.text} key={"info-initializing"}>
                    <div>
                        <Translatable>connecting</Translatable> <LoadingDots />
                    </div>
                </div>
            );

        case "connected":
            const streamMap = getVideoStreamMap();
            if(typeof streamMap[state.streamObjectId] === "undefined") {
                return (
                    <div className={cssStyle.text} key={"missing-stream-object"}>
                        <div>
                            <Translatable>Missing stream object</Translatable>
                        </div>
                    </div>
                );
            }

            return (
                <MediaStreamVideoRenderer
                    stream={streamMap[state.streamObjectId]}
                    className={props.className}
                    title={props.streamType === "camera" ? tr("Camera") : tr("Screen")}
                    key={"connected"}
                />
            );

        case "failed":
            return (
                <div className={joinClassList(cssStyle.text, cssStyle.error)} key={"error"}>
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
});

const VideoPlayer = React.memo((props: { videoId: string, cameraState: ChannelVideoStreamState, screenState: ChannelVideoStreamState }) => {
    const streamElements = [];
    const streamClasses = [ cssStyle.videoPrimary, cssStyle.videoSecondary ];

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
                <VideoStreamPlayer key={"stream-screen"} videoId={props.videoId} streamType={"screen"} className={streamClasses.pop_front()} />
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
                <VideoStreamPlayer key={"stream-camera"} videoId={props.videoId} streamType={"camera"} className={streamClasses.pop_front()} />
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

const VideoToggleButton = React.memo((props: { videoId: string, broadcastType: VideoBroadcastType, target: boolean }) => {
    const events = useContext(EventContext);

    let title;
    let icon: ClientIcon;
    if(props.broadcastType === "camera") {
        title = props.target ? useTr("Unmute screen video") : useTr("Mute screen video");
        icon = ClientIcon.ShareScreen;
    } else {
        title = props.target ? useTr("Unmute camera video") : useTr("Mute camera video");
        icon = ClientIcon.VideoMuted;
    }

    return (
        <div className={joinClassList(cssStyle.iconContainer, cssStyle.toggle, !props.target && cssStyle.disabled)}
             onClick={() => events.fire("action_toggle_mute", { videoId: props.videoId, broadcastType: props.broadcastType, muted: props.target })}
             title={title}
        >
            <ClientIconRenderer className={cssStyle.icon} icon={icon} />
        </div>
    )
});

const VideoControlButtons = React.memo((props: {
    videoId: string,
    cameraState: ChannelVideoStreamState,
    screenState: ChannelVideoStreamState,
    isSpotlight: boolean,
    fullscreenMode: "none" | "unavailable" | "set"
}) => {
    const events = useContext(EventContext);

    let buttons = [];
    if(props.videoId !== kLocalVideoId) {
        switch (props.screenState) {
            case "available":
            case "ignored":
                buttons.push(
                    <VideoToggleButton videoId={props.videoId} target={false} broadcastType={"screen"} key={"screen-disabled"} />
                );
                break;

            case "streaming":
                buttons.push(
                    <VideoToggleButton videoId={props.videoId} target={true} broadcastType={"screen"} key={"screen-enabled"} />
                );
                break;

            case "none":
            default:
                break;
        }

        switch (props.cameraState) {
            case "available":
            case "ignored":
                buttons.push(
                    <VideoToggleButton videoId={props.videoId} target={false} broadcastType={"camera"} key={"camera-disabled"} />
                );
                break;

            case "streaming":
                buttons.push(
                    <VideoToggleButton videoId={props.videoId} target={true} broadcastType={"camera"} key={"camera-enabled"} />
                );
                break;

            case "none":
            default:
                break;
        }
    }

    buttons.push(
        <div className={cssStyle.iconContainer + " " + (props.fullscreenMode === "unavailable" ? cssStyle.hidden : "")}
             key={"spotlight"}
             onClick={() => {
                 if(props.isSpotlight) {
                     events.fire("action_set_fullscreen", { videoId: props.fullscreenMode === "set" ? undefined : props.videoId });
                 } else {
                     events.fire("action_toggle_spotlight", { videoIds: [ props.videoId ], expend: true, enabled: true });
                     events.fire("action_focus_spotlight", { });
                 }
             }}
             title={props.isSpotlight ? tr("Toggle fullscreen") : tr("Toggle spotlight")}
        >
            <ClientIconRenderer className={cssStyle.icon} icon={ClientIcon.Fullscreen} />
        </div>
    );

    return (
        <div className={cssStyle.actionIcons}>
            {buttons}
        </div>
    );
});

export const VideoContainer = React.memo((props: { isSpotlight: boolean }) => {
    const videoId = useContext(VideoIdContext);

    const events = useContext(EventContext);
    const refContainer = useRef<HTMLDivElement>();
    const fullscreenCapable = "requestFullscreen" in HTMLElement.prototype;

    const [ isFullscreen, setFullscreen ] = useState(false);

    const [ cameraState, setCameraState ] = useState<ChannelVideoStreamState>("none");
    const [ screenState, setScreenState ] = useState<ChannelVideoStreamState>(() => {
        events.fire("query_video", { videoId: videoId });
        return "none";
    });

    events.reactUse("notify_video", event => {
        if(event.videoId === videoId) {
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
        if(event.videoId === videoId) {
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
            className={cssStyle.videoContainer + " " + cssStyle.outlined}
            onDoubleClick={() => {
                if(isFullscreen) {
                    events.fire("action_set_fullscreen", { videoId: undefined });
                } else if(props.isSpotlight) {
                    events.fire("action_set_fullscreen", { videoId: videoId });
                } else {
                    events.fire("action_toggle_spotlight", { videoIds: [ videoId ], expend: true, enabled: true });
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
                            events.fire("action_set_pip", { videoId: videoId, broadcastType: streamType as any });
                        },
                        visible: !!streamType && "requestPictureInPicture" in HTMLVideoElement.prototype
                    },
                    {
                        type: "normal",
                        label: isFullscreen ? tr("Release fullscreen") : tr("Show in fullscreen"),
                        icon: ClientIcon.Fullscreen,
                        click: () => {
                            events.fire("action_set_fullscreen", { videoId: isFullscreen ? undefined : videoId });
                        }
                    },
                    {
                        type: "normal",
                        label: props.isSpotlight ? tr("Release spotlight") : tr("Put client in spotlight"),
                        icon: ClientIcon.Fullscreen,
                        click: () => {
                            events.fire("action_toggle_spotlight", { videoIds: [ videoId ], expend: true, enabled: !props.isSpotlight });
                            events.fire("action_focus_spotlight", { });
                        }
                    }
                ]);
            }}
            ref={refContainer}
        >
            <VideoPlayer videoId={videoId} cameraState={cameraState} screenState={screenState} />
            <VideoClientInfo videoId={videoId} />
            <VideoViewerCount />
            <VideoControlButtons
                videoId={videoId}
                cameraState={cameraState}
                screenState={screenState}
                isSpotlight={props.isSpotlight}
                fullscreenMode={fullscreenCapable ? isFullscreen ? "set" : "none" : "unavailable"}
            />
        </div>
    );
});

const VideoBarArrow = React.memo((props: { direction: "left" | "right", shown: boolean, containerRef: React.RefObject<HTMLDivElement> }) => {
    const events = useContext(EventContext);

    return (
        <div className={cssStyle.arrow + " " + cssStyle[props.direction] + " " + (props.shown ? "" : cssStyle.hidden)} ref={props.containerRef}>
            <div className={cssStyle.iconContainer} onClick={() => events.fire("action_video_scroll", { direction: props.direction })}>
                <ClientIconRenderer icon={ClientIcon.SimpleArrow} className={cssStyle.icon} />
            </div>
        </div>
    );
});

const VideoBar = React.memo(() => {
    const events = useContext(EventContext);
    const refVideos = useRef<HTMLDivElement>();
    const refArrowRight = useRef<HTMLDivElement>();
    const refArrowLeft = useRef<HTMLDivElement>();

    const [ arrowLeftShown, setArrowLeftShown ] = useState(false);
    const [ arrowRightShown, setArrowRightShown ] = useState(false);

    const [ videos, setVideos ] = useState<string[]>(() => {
        events.fire("query_videos");
        return [];
    });
    events.reactUse("notify_videos", event => setVideos(event.videoIds));

    const updateScrollButtons = useCallback(() => {
        const container = refVideos.current;
        if(!container) { return; }

        const rightEndReached = container.scrollLeft + container.clientWidth + 1 >= container.scrollWidth;
        const leftEndReached = container.scrollLeft <= .9;
        setArrowLeftShown(!leftEndReached);
        setArrowRightShown(!rightEndReached);
    }, [ refVideos ]);

    events.reactUse("action_video_scroll", event => {
        const container = refVideos.current;
        const arrowLeft = refArrowLeft.current;
        const arrowRight = refArrowRight.current;
        if(!container || !arrowLeft || !arrowRight) {
            return;
        }

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
                {videos.map(videoId => (
                    <ErrorBoundary key={videoId}>
                        <VideoIdContext.Provider value={videoId}>
                            <VideoContainer isSpotlight={false} />
                        </VideoIdContext.Provider>
                    </ErrorBoundary>
                ))}
            </div>
            <VideoBarArrow direction={"left"} containerRef={refArrowLeft} shown={arrowLeftShown} />
            <VideoBarArrow direction={"right"} containerRef={refArrowRight} shown={arrowRightShown} />
        </div>
    )
});


const PanelContainer = (props: { children }) => {
    const refSpotlightContainer = useRef<HTMLDivElement>();
    const [ spotlightDimensions, setSpotlightDimensions ] = useState<SpotlightDimensions>({ width: 1200, height: 900 });

    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            const entry = entries.last();
            const newDimensions = { height: entry.contentRect.height, width: entry.contentRect.width };

            if(newDimensions.width === 0) {
                /* div most likely got removed or something idk... */
                return;
            }

            if(_.isEqual(newDimensions, spotlightDimensions)) {
                return;
            }

            setSpotlightDimensions(newDimensions);
            logTrace(LogCategory.VIDEO, tr("New spotlight dimensions: %o"), entry.contentRect);
        });

        resizeObserver.observe(refSpotlightContainer.current);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <SpotlightDimensionsContext.Provider value={spotlightDimensions}>
            <div className={cssStyle.panel}>
                {props.children}
            </div>
            <div className={cssStyle.heightProvider}>
                <div className={cssStyle.videoBar} />
                <div className={cssStyle.spotlight} ref={refSpotlightContainer} />
            </div>
        </SpotlightDimensionsContext.Provider>
    );
}

const VisibilityHandler = React.memo((props: {
    children
}) => {
    const events = useContext(EventContext);
    const [ streamingCount, setStreamingCount ] = useState<number>(() => {
        events.fire("query_videos");
        return 0;
    });
    const [ expanded, setExpanded ] = useState<boolean>(() => {
        events.fire("query_expended");
        return false;
    })

    events.reactUse("notify_videos", event => setStreamingCount(event.videoActiveCount));
    events.reactUse("notify_expended", event => setExpanded(event.expended));
    return (
        <div className={joinClassList(cssStyle.container, streamingCount === 0 && cssStyle.hidden, expanded && cssStyle.expended)}>
            {props.children}
        </div>
    )
});

export const ChannelVideoRenderer = React.memo((props: { handlerId: string, events: Registry<ChannelVideoEvents> }) => {
    return (
        <EventContext.Provider value={props.events}>
            <HandlerIdContext.Provider value={props.handlerId}>
                <VisibilityHandler>
                    <PanelContainer>
                        <VideoSubscribeContextProvider>
                            <VideoBar />
                            <ExpendArrow />
                            <ErrorBoundary>
                                <Spotlight />
                            </ErrorBoundary>
                        </VideoSubscribeContextProvider>
                    </PanelContainer>
                </VisibilityHandler>
            </HandlerIdContext.Provider>
        </EventContext.Provider>
    );
});