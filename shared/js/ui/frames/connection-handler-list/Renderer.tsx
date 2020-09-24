import {Registry} from "tc-shared/events";
import {ConnectionListUIEvents, HandlerStatus} from "tc-shared/ui/frames/connection-handler-list/Definitions";
import * as React from "react";
import {useContext, useEffect, useRef, useState} from "react";
import {IconRenderer, LocalIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {ClientIcon} from "svg-sprites/client-icons";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import ResizeObserver from 'resize-observer-polyfill';
import {LogCategory, logWarn} from "tc-shared/log";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";

const cssStyle = require("./Renderer.scss");
const Events = React.createContext<Registry<ConnectionListUIEvents>>(undefined);


const ConnectionHandler = (props: { handlerId: string, active: boolean }) => {
    const events = useContext(Events);

    const [ status, setStatus ] = useState<HandlerStatus | "loading">(() => {
        events.fire_async("query_handler_status", { handlerId: props.handlerId });
        return "loading";
    });

    events.reactUse("notify_handler_status", event => {
        if(event.handlerId !== props.handlerId) {
            return;
        }

        setStatus(event.status);
    });

    let displayedName;
    let cutoffName = false;
    let voiceReplaying = false;
    let icon = <IconRenderer icon={ClientIcon.ServerGreen} key={"default"} />;
    if(status === "loading") {
        displayedName = tr("loading status");
    } else {
        switch (status.connectionState) {
            case "connected":
                cutoffName = status.handlerName.length > 30;
                voiceReplaying = status.voiceReplaying;
                displayedName = <React.Fragment key={"connected"}>{status.handlerName}</React.Fragment>;
                if(status.serverIcon) {
                    icon = <LocalIconRenderer icon={status.serverIcon} key={"server-icon"} />;
                }
                break;

            case "connecting":
                displayedName = <Translatable key={"connecting"}>Connecting to server <LoadingDots /></Translatable>;
                break;

            case "disconnected":
                displayedName = <Translatable key={"not connected"}>Not connected</Translatable>;
                break;
        }
    }

    return (
        <div className={cssStyle.handler + " " + (props.active ? cssStyle.active : "") + " " + (cutoffName ? cssStyle.cutoffName : "") + " " + (voiceReplaying ? cssStyle.audioPlayback : "")}
             onClick={() => {
                 if(props.active) {
                    return;
                 }

                 events.fire("action_set_active_handler", { handlerId: props.handlerId });
             }}
        >
            <div className={cssStyle.icon}>
                {icon}
            </div>
            <div className={cssStyle.name} title={displayedName}>{displayedName}</div>
            <div className={cssStyle.buttonClose} onClick={() => {
                events.fire("action_destroy_handler", { handlerId: props.handlerId })
            }}>
                <IconRenderer icon={ClientIcon.TabCloseButton} />
            </div>
        </div>
    );
}

const HandlerList = (props: { refContainer: React.Ref<HTMLDivElement>, refSpacer: React.Ref<HTMLDivElement> }) => {
    const events = useContext(Events);

    const [ handlers, setHandlers ] = useState<string[] | "loading">(() => {
        events.fire("query_handler_list");
        return "loading";
    });

    const [ activeHandler, setActiveHandler ] = useState<string>();

    events.reactUse("notify_handler_list", event => {
        setHandlers(event.handlerIds.slice());
        setActiveHandler(event.activeHandlerId);
    });
    events.reactUse("notify_active_handler", event => setActiveHandler(event.handlerId));

    return (
        <div className={cssStyle.handlerList} ref={props.refContainer}>
            {handlers === "loading" ? undefined :
                handlers.map(handlerId => <ConnectionHandler handlerId={handlerId} key={handlerId} active={handlerId === activeHandler} />)
            }
            <div className={cssStyle.scrollSpacer} ref={props.refSpacer} />
        </div>
    )
}

const ScrollMenu = (props: { shown: boolean }) => {
    const events = useContext(Events);

    const [ scrollLeft, setScrollLeft ] = useState(false);
    const [ scrollRight, setScrollRight ] = useState(false);

    events.on("notify_scroll_status", event => {
        setScrollLeft(event.left);
        setScrollRight(event.right);
    });

    return (
        <div className={cssStyle.containerScroll + " " + (props.shown ? cssStyle.shown : "")}>
            <div className={cssStyle.buttonScroll + " " + (!scrollLeft ? cssStyle.disabled : "")} onClick={() => scrollLeft && events.fire_async("action_scroll", { direction: "left" })}>
                <ClientIconRenderer icon={ClientIcon.ArrowLeft} />
            </div>
            <div className={cssStyle.buttonScroll + " " + (!scrollRight ? cssStyle.disabled : "")} onClick={() => scrollRight && events.fire_async("action_scroll", { direction: "right" })}>
                <ClientIconRenderer icon={ClientIcon.ArrowRight} />
            </div>
        </div>
    );
}

export const ConnectionHandlerList = (props: { events: Registry<ConnectionListUIEvents> }) => {
    const [ shown, setShown ] = useState(false);
    const observer = useRef<ResizeObserver>();
    const refHandlerContainer = useRef<HTMLDivElement>();
    const refContainer = useRef<HTMLDivElement>();
    const refScrollSpacer = useRef<HTMLDivElement>();

    const refScrollShown = useRef(false);
    const [ scrollShown, setScrollShown ] = useState(false);
    refScrollShown.current = scrollShown;

    const updateScrollButtons = (scrollLeft: number) => {
        const container = refHandlerContainer.current;
        if(!container) { return; }
        props.events.fire_async("notify_scroll_status", { right: Math.ceil(scrollLeft + container.clientWidth + 2) < container.scrollWidth, left: scrollLeft !== 0 });
    }

    useEffect(() => {
        if(!refHandlerContainer.current) {
            return;
        }

        if(observer.current) {
            throw "useEffect called without a detachment...";
        }

        observer.current = new ResizeObserver(events => {
            if(!refContainer.current || !refHandlerContainer.current) {
                return;
            }

            if(events.length !== 1) {
                logWarn(LogCategory.CLIENT, tr("Handler list resize observer received events for more than one element (%d elements)."), events.length);
                return;
            }

            const width = events[0].target.scrollWidth;
            const shouldScroll = width > refContainer.current.clientWidth;

            let scrollShown = refScrollShown.current;
            if(scrollShown && !shouldScroll) {
                props.events.fire_async("notify_scroll_status", { left: false, right: false });
            } else if(!scrollShown && shouldScroll) {
                props.events.fire_async("notify_scroll_status", { left: false, right: true });
            } else {
                return;
            }

            setScrollShown(shouldScroll);
        });
        observer.current.observe(refHandlerContainer.current);
        return () => {
            observer.current?.disconnect();
            observer.current = undefined;
        }
    }, []);

    props.events.reactUse("notify_handler_list", event => setShown(event.handlerIds.length > 1));
    props.events.reactUse("action_scroll", event => {
        if(!scrollShown || !refHandlerContainer.current || !refScrollSpacer.current) {
            return;
        }

        const container = refHandlerContainer.current;
        const scrollContainer = refScrollSpacer.current;
        const getChildAt = (width: number) => {
            let currentChild: HTMLDivElement;
            for(const childElement of container.children) {
                const child = childElement as HTMLDivElement;
                if((!currentChild || child.offsetLeft > currentChild.offsetLeft) && child.offsetLeft <= width) {
                    currentChild = child;
                }
            }

            return currentChild;
        }

        let scrollLeft;
        if(event.direction === "right") {
            const currentLeft = container.scrollLeft;
            const target = getChildAt(currentLeft + container.clientWidth + 5 - scrollContainer.clientWidth);
            if(!target) {
                /* well we're fucked up? :D */
                scrollLeft = container.scrollLeft + 50;
            } else {
                scrollLeft = target.offsetLeft + target.clientWidth - container.clientWidth + scrollContainer.clientWidth;
            }
        } else if(event.direction === "left") {
            const currentLeft = container.scrollLeft;
            const target = getChildAt(currentLeft - 1);
            if(!target) {
                /* well we're fucked up? :D */
                scrollLeft = container.scrollLeft - 50;
            } else {
                scrollLeft = target.offsetLeft;
            }
        } else {
            return;
        }

        container.scrollLeft = scrollLeft;
        updateScrollButtons(scrollLeft);
    }, true, [scrollShown]);
    return (
        <Events.Provider value={props.events}>
            <div className={cssStyle.container + " " + (shown ? cssStyle.shown : "") + " " + (scrollShown ? cssStyle.scrollShown : "")} ref={refContainer}>
                <HandlerList refContainer={refHandlerContainer} refSpacer={refScrollSpacer} />
                <ScrollMenu shown={scrollShown} />
            </div>
        </Events.Provider>
    )
};