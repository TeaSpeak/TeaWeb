import * as React from "react";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {Registry} from "tc-shared/events";
import {ChannelVideo, ChannelVideoEvents, ChannelVideoInfo, kLocalVideoId} from "tc-shared/ui/frames/video/Definitions";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {ClientTag} from "tc-shared/ui/tree/EntryTags";
import ResizeObserver from "resize-observer-polyfill";

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

const VideoStreamReplay = React.memo((props: { stream: MediaStream | undefined, className: string }) => {
    const refVideo = useRef<HTMLVideoElement>();

    useEffect(() => {
        const video = refVideo.current;
        if(props.stream) {
            video.style.opacity = "1";
            video.srcObject = props.stream;
            video.autoplay = true;
            video.play().then(undefined);
        } else {
            video.style.opacity = "0";
        }
    }, [ props.stream ]);

    return (
        <video ref={refVideo} className={cssStyle.video + " " + props.className} />
    )
});

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
        if(state.desktopStream && state.cameraStream) {
            /* TODO: Select primary and secondary and display them */
            return (
                <VideoStreamReplay stream={state.desktopStream} key={"replay-multi"} className={cssStyle.videoPrimary} />
            );
        } else {
            const stream = state.desktopStream || state.cameraStream;
            if(stream) {
                return (
                    <VideoStreamReplay stream={stream} key={"replay-single"} className={cssStyle.videoPrimary} />
                );
            } else {
                return (
                    <div className={cssStyle.text} key={"no-video-stream"}>
                        <div><Translatable>No Video</Translatable></div>
                    </div>
                );
            }
        }
    } else if(state.status === "no-video") {
        return (
            <div className={cssStyle.text} key={"no-video"}>
                <div><Translatable>No Video</Translatable></div>
            </div>
        );
    }

    return null;
});

const VideoContainer = React.memo((props: { videoId: string }) => {
    const events = useContext(EventContext);
    return (
        <div
            className={cssStyle.videoContainer}
            onDoubleClick={() => events.fire("action_set_spotlight", { videoId: props.videoId })}
            onContextMenu={event => {
                event.preventDefault()
            }}
        >
            <VideoPlayer videoId={props.videoId} />
            <VideoInfo videoId={props.videoId} />
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
                    videos.map(videoId => <VideoContainer videoId={videoId} key={videoId} />)
                }
            </div>
            <VideoBarArrow direction={"left"} containerRef={refArrowLeft} />
            <VideoBarArrow direction={"right"} containerRef={refArrowRight} />
        </div>
    )
};

const Spotlight = () => {
    const events = useContext(EventContext);
    const [ videoId, setVideoId ] = useState<string>(() => {
        events.fire("query_spotlight");
        return undefined;
    });
    events.reactUse("notify_spotlight", event => setVideoId(event.videoId));

    let body;
    if(videoId) {
        body = <VideoContainer videoId={videoId} key={"video-" + videoId} />;
    } else {
        body = (
            <div className={cssStyle.videoContainer} key={"no-video"}>
                <div className={cssStyle.text}><Translatable>No spotlight selected</Translatable></div>
            </div>
        );
    }
    return (
        <div className={cssStyle.spotlight}>
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