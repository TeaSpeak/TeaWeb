import {Registry} from "tc-shared/events";
import {
    ConnectionListUIEvents,
    HandlerStatus,
    MouseMoveCoordinates
} from "tc-shared/ui/frames/connection-handler-list/Definitions";
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

type ConnectionHandlerMode = "normal" | "active" | "spacer";
const ConnectionHandler = React.memo((props: { handlerId: string, mode: ConnectionHandlerMode, refContainer?: React.Ref<HTMLDivElement> }) => {
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
                displayedName = <><Translatable key={"connecting"}>Connecting to server</Translatable> <LoadingDots /></>;
                break;

            case "disconnected":
                displayedName = <Translatable key={"not connected"}>Not connected</Translatable>;
                displayedName = props.handlerId;
                break;
        }
    }

    return (
        <div className={cssStyle.handler + " " + cssStyle["mode-" + props.mode] + " " + (cutoffName ? cssStyle.cutoffName : "") + " " + (voiceReplaying ? cssStyle.audioPlayback : "")}
             onClick={() => {
                 if(props.mode !== "normal") {
                     return;
                 }

                 events.fire("action_set_active_handler", { handlerId: props.handlerId });
             }}
             ref={props.refContainer}
             x-handler-id={props.handlerId}
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
})

const MoveableConnectionHandler = (props: { handlerId: string, mode: ConnectionHandlerMode }) => {
    const events = useContext(Events);
    const refContainer = useRef<HTMLDivElement>();

    useEffect(() => {
        if(!refContainer.current) {
            return;
        }

        const attached = { status: false };
        const basePoint = { x: 0, y: 0 };

        const mouseDownListener = (event: MouseEvent) => {
            basePoint.x = event.pageX;
            basePoint.y = event.pageY;
            attachListener();
        };

        const mouseMoveListener = (event: MouseEvent) => {
            const diffXSqrt = Math.abs(basePoint.x - event.pageX);
            if(diffXSqrt > 10) {
                events.fire("action_move_handler", {
                    handlerId: props.handlerId,
                    mouse: { x: event.pageX, y: event.pageY, xOffset: basePoint.x + refContainer.current.parentElement.scrollLeft - refContainer.current.offsetLeft }
                });
                detachListener();
            }
        };

        const mouseUpListener = () => detachListener;

        const attachListener = () => {
            if(attached.status) { return; }
            attached.status = true;

            document.addEventListener("mousemove", mouseMoveListener);
            document.addEventListener("mouseup", mouseUpListener);
            document.addEventListener("mouseleave", mouseUpListener);
        };

        const detachListener = () => {
            if(!attached.status) { return; }
            attached.status = false;

            document.removeEventListener("mousemove", mouseMoveListener);
            document.removeEventListener("mouseup", mouseUpListener);
            document.removeEventListener("mouseleave", mouseUpListener);
        }

        refContainer.current.addEventListener("mousedown", mouseDownListener);

        return () => {
            refContainer.current.removeEventListener("mousedown", mouseDownListener);
            detachListener();
        }
    });

    return <ConnectionHandler handlerId={props.handlerId} mode={props.mode} refContainer={refContainer} />
};

const MovingConnectionHandler = React.memo((props: { handlerId: string, handlerActive: boolean, initialMouse: MouseMoveCoordinates }) => {
    const events = useContext(Events);

    const refContainer = useRef<HTMLDivElement>();
    const offsetX = useRef<number>(0);
    const mouseXRef = useRef<number>(props.initialMouse.x);

    const scrollValue = useRef<number>(0);
    const scrollIntervalReference = useRef<number>(0);

    useEffect(() => {
        if(!refContainer.current ||!refContainer.current.parentElement) { return; }

        refContainer.current.style.display = "flex";

        let lastMovingEventPositionX = 0;

        const executeUpdate = () => {
            if(!refContainer.current?.parentElement) { return; }
            const parentElement = refContainer.current.parentElement;

            updateContainerPosition(mouseXRef.current, parentElement, false);
            updateScroll(mouseXRef.current, parentElement);
        }

        const updateScroll = (mouseX: number, parentElement: HTMLElement) => {
            if(mouseX >= parentElement.offsetLeft + parentElement.clientWidth - 100) {
                scrollValue.current = +2;
            } else if(mouseX <= refContainer.current.parentElement.offsetLeft + 100) {
                scrollValue.current = -2;
            } else {
                scrollValue.current = 0;
            }

            if(scrollValue.current) {
                if(!scrollIntervalReference.current) {
                    scrollIntervalReference.current = setInterval(() => {
                        if(!scrollValue.current) {
                            logWarn(LogCategory.CLIENT, tr("Scroll interval called, but no scroll direction set"));
                            return;
                        }

                        const targetScrollLeft = parentElement.scrollLeft + scrollValue.current;
                        const cancelScroll = targetScrollLeft < 0 || Math.ceil(targetScrollLeft + parentElement.clientWidth) + 1 >= parentElement.scrollWidth;
                        if(cancelScroll) {
                            clearInterval(scrollIntervalReference.current);
                            scrollIntervalReference.current = -1; /* set, but inactive, needs to be re triggered */
                        } else {
                            parentElement.scrollLeft = targetScrollLeft;
                        }
                        updateContainerPosition(mouseXRef.current, parentElement, cancelScroll);
                    }, 5);
                    parentElement.classList.add(cssStyle.hardScroll);
                }
            } else {
                if(scrollIntervalReference.current) {
                    clearInterval(scrollIntervalReference.current);
                    scrollIntervalReference.current = 0;

                    /* stop the scroll ( + 1 - 1 has been appended for the ide...) */
                    parentElement.scrollLeft = parentElement.scrollLeft + 1 - 1;
                    parentElement.classList.remove(cssStyle.hardScroll);
                }
            }
        }

        const updateContainerPosition = (mouseX: number, parentElement: HTMLElement, forceFirePositionUpdate: boolean) => {
            offsetX.current = (mouseX - parentElement.offsetLeft) - props.initialMouse.xOffset + parentElement.scrollLeft;
            if(offsetX.current + props.initialMouse.xOffset < 0) { return; }
            if(Math.ceil(offsetX.current + refContainer.current.clientWidth) + 1 >= parentElement.scrollWidth) { return; }

            refContainer.current.style.left = offsetX.current + "px";

            if(Math.abs(lastMovingEventPositionX - offsetX.current) > 30 || forceFirePositionUpdate) {
                lastMovingEventPositionX = offsetX.current;
                fireMovingPositionEvent();
            }
        };

        const fireMovingPositionEvent = () => {
            events.fire("action_set_moving_position", { offsetX: offsetX.current , width: refContainer.current.clientWidth });
        };

        const listenerMove = (event: MouseEvent) => {
            mouseXRef.current = event.pageX;
            executeUpdate();
        }

        const listenerUp = () => {
            events.fire("action_move_handler", { handlerId: undefined });
        }

        executeUpdate();

        document.addEventListener("mousemove", listenerMove);
        document.addEventListener("mouseup", listenerUp);
        document.addEventListener("mouseleave", listenerUp);

        return () => {
            clearInterval(scrollIntervalReference.current);
            if(refContainer.current?.parentElement) {
                const parentElement = refContainer.current?.parentElement;
                parentElement.classList.remove(cssStyle.hardScroll);

                /* stop the scroll ( + 1 - 1 has been appended for the ide...) */
                parentElement.scrollLeft = parentElement.scrollLeft + 1 - 1;
            }

            document.removeEventListener("mouseup", listenerUp);
            document.removeEventListener("mouseleave", listenerUp);
            document.removeEventListener("mousemove", listenerMove);
        };
    });

    return (
        <div className={cssStyle.moveContainer} ref={refContainer}>
            <ConnectionHandler handlerId={props.handlerId} mode={props.handlerActive ? "active" : "normal"} />
        </div>
    );
});

const HandlerList = (props: { refContainer: React.RefObject<HTMLDivElement>, refSpacer: React.Ref<HTMLDivElement> }) => {
    const events = useContext(Events);

    const [ handlers, setHandlers ] = useState<string[] | "loading">(() => {
        events.fire("query_handler_list");
        return "loading";
    });

    const [ activeHandler, setActiveHandler ] = useState<string>();
    const [ movingHandler, setMovingHandler ] = useState<{ handlerId: string, mouse: MouseMoveCoordinates} | undefined>();
    const switchRequestTimestamp = useRef(0);

    events.reactUse("notify_handler_list", event => {
        setHandlers(event.handlerIds.slice());
        setActiveHandler(event.activeHandlerId);
    });
    events.reactUse("notify_active_handler", event => setActiveHandler(event.handlerId));
    events.reactUse("action_move_handler", event => {
        if(typeof event.handlerId === "undefined") {
            setMovingHandler(undefined);
        } else {
            setMovingHandler({ handlerId: event.handlerId, mouse: event.mouse });
        }
    });

    events.reactUse("action_set_moving_position", event => {
        if(!movingHandler || handlers === "loading" || (Date.now() - switchRequestTimestamp.current) < 1000) { return; }

        const centerCurrent = event.offsetX + event.width / 2;

        /* get the target element */
        const children = [...props.refContainer.current.childNodes.values()] as HTMLElement[];
        const element = children.find(element => element.offsetLeft <= centerCurrent && centerCurrent <= element.offsetLeft + element.clientWidth);
        const handlerId = element?.getAttribute("x-handler-id");
        if(handlerId === movingHandler.handlerId || !handlerId) { return; }

        const oldIndex = handlers.findIndex(handler => handler === movingHandler.handlerId);
        const newIndex = handlers.findIndex(handler => handler === handlerId);

        const centerTarget = element.offsetLeft + element.clientWidth / 2;
        if(oldIndex < newIndex) {
            if(event.offsetX + event.width < centerTarget) {
                return;
            }
        } else {
            if(event.offsetX > centerTarget) {
                return;
            }
        }

        events.fire("action_swap_handler", { handlerIdOne: handlers[oldIndex], handlerIdTwo: handlers[newIndex] });
        switchRequestTimestamp.current = Date.now();
    });

    /* no switch pending, everything has been rendered */
    useEffect(() => { switchRequestTimestamp.current = 0; });

    return (
        <div className={cssStyle.handlerList} ref={props.refContainer}>
            {handlers === "loading" ? undefined :
                handlers.map(handlerId => (
                    <MoveableConnectionHandler
                        handlerId={handlerId}
                        key={handlerId}
                        mode={handlerId === movingHandler?.handlerId ? "spacer" : handlerId === activeHandler ? "active" : "normal"}
                    />
                ))
            }
            { movingHandler ? (
                <MovingConnectionHandler
                    handlerId={movingHandler.handlerId}
                    key={"moving-" + movingHandler.handlerId}
                    handlerActive={movingHandler.handlerId === activeHandler}
                    initialMouse={movingHandler.mouse}
                />
            ) : undefined}
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
        let scrollLeft;

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