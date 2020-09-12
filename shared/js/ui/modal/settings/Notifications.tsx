import * as React from "react";
import {useRef, useState} from "react";
import {Registry} from "tc-shared/events";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {FlatInputField} from "tc-shared/ui/react-elements/InputField";
import {EventType} from "tc-shared/ui/frames/log/Definitions";
import {
    getRegisteredNotificationDispatchers,
    isNotificationEnabled
} from "tc-shared/ui/frames/log/DispatcherNotifications";
import {Settings, settings} from "tc-shared/settings";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {Tooltip} from "tc-shared/ui/react-elements/Tooltip";
import {isFocusRequestEnabled} from "tc-shared/ui/frames/log/DispatcherFocus";

const cssStyle = require("./Notifications.scss");

type NotificationState = "enabled" | "disabled" | "unavailable";

interface EventGroup {
    key: string;
    name: string;

    events?: string[];
    subgroups?: EventGroup[];
}

interface NotificationSettingsEvents {
    action_set_filter: { filter: string }, /* will toggle a notify_event_info */
    action_toggle_group: { groupKey: string, collapsed: boolean },

    action_set_state: {
        key: string,
        state: "log" | "notification" | "focus",
        value: NotificationState
    },

    query_events: {},
    query_event_info: { key: string },

    notify_events: {
        groups: EventGroup[], focusEnabled: boolean
    },
    notify_event_info: {
        key: string;
        name: string;

        focus: NotificationState;
        notification: NotificationState;
        log: NotificationState;
    },
    notify_set_state_result: {
        key: string,
        state: "log" | "notification" | "focus",
        value: NotificationState
    }
}

const EventTableHeader = (props: { focus: boolean }) => {
    return (
        <div className={cssStyle.tableHeader + " " + cssStyle.tableEntry}>
            <div className={cssStyle.column + " " + cssStyle.columnKey}>
                <a><Translatable>Event</Translatable></a>
            </div>
            {!props.focus ? undefined :
                <div key={"focus"} className={cssStyle.column + " " + cssStyle.columnLog}>
                    <a><Translatable>Focus</Translatable></a>
                    <Tooltip tooltip={() => (
                        <Translatable>Draw focus to the window when the event occurs</Translatable>
                    )}>
                        <div className={cssStyle.tooltip}>
                            <img src="img/icon_tooltip_notifications.svg"/>
                        </div>
                    </Tooltip>
                </div>
            }
            <div className={cssStyle.column + " " + cssStyle.columnNotification}>
                <a><Translatable>Notify</Translatable></a>
                <Tooltip tooltip={() => (
                    <Translatable>Sending out a system notification</Translatable>
                )}>
                    <div className={cssStyle.tooltip}>
                        <img src="img/icon_tooltip_notifications.svg"/>
                    </div>
                </Tooltip>
            </div>
            <div className={cssStyle.column + " " + cssStyle.columnLog}>
                <a><Translatable>Log</Translatable></a>
                <Tooltip tooltip={() => (
                    <Translatable>Log the event within the client server log</Translatable>
                )}>
                    <div className={cssStyle.tooltip}>
                        <img src="img/icon_tooltip_notifications.svg"/>
                    </div>
                </Tooltip>
            </div>
        </div>
    )
};

const EventTableEntry = React.memo((props: { events: Registry<NotificationSettingsEvents>, event: string, depth: number, focusEnabled: boolean }) => {
    const [name, setName] = useState(() => {
        props.events.fire_async("query_event_info", {key: props.event});
        return undefined;
    });
    const [notificationState, setNotificationState] = useState<NotificationState>("unavailable");
    const [logState, setLogState] = useState<NotificationState>("unavailable");
    const [focusState, setFocusState] = useState<NotificationState>("unavailable");

    const [notificationApplying, setNotificationApplying] = useState(false);
    const [logApplying, setLogApplying] = useState(false);
    const [focusApplying, setFocusApplying] = useState(false);

    props.events.reactUse("notify_event_info", event => {
        if (event.key !== props.event)
            return;

        setName(event.name);
        setNotificationState(event.notification);
        setLogState(event.log);
        setFocusState(event.focus);
    });

    props.events.reactUse("action_set_state", event => {
        if (event.key !== props.event)
            return;

        switch (event.state) {
            case "notification":
                setNotificationApplying(true);
                break;

            case "log":
                setLogApplying(true);
                break;

            case "focus":
                setFocusApplying(true);
                break;
        }
    });

    props.events.reactUse("notify_set_state_result", event => {
        if (event.key !== props.event)
            return;

        switch (event.state) {
            case "notification":
                setNotificationApplying(false);
                setNotificationState(event.value);
                break;

            case "log":
                setLogApplying(false);
                setLogState(event.value);
                break;

            case "focus":
                setFocusApplying(false);
                setFocusState(event.value);
                break;
        }
    });

    let notificationElement, logElement, focusElement;
    if (notificationState === "unavailable") {
        notificationElement = null;
    } else {
        notificationElement = (
            <Checkbox key={"notification"} value={notificationState === "enabled"} onChange={value => {
                props.events.fire("action_set_state", {
                    key: props.event,
                    state: "notification",
                    value: value ? "enabled" : "disabled"
                });
            }} disabled={notificationApplying}/>
        );
    }

    if (logState === "unavailable") {
        logElement = null;
    } else {
        logElement = (
            <Checkbox key={"notification"} value={logState === "enabled"} onChange={value => {
                props.events.fire("action_set_state", {
                    key: props.event,
                    state: "log",
                    value: value ? "enabled" : "disabled"
                });
            }} disabled={logApplying}/>
        );
    }

    if (focusState === "unavailable") {
        focusElement = null;
    } else {
        focusElement = (
            <Checkbox key={"focus"} value={focusState === "enabled"} onChange={value => {
                props.events.fire("action_set_state", {
                    key: props.event,
                    state: "focus",
                    value: value ? "enabled" : "disabled"
                });
            }} disabled={focusApplying}/>
        );
    }

    return (
        <div className={cssStyle.tableEntry} style={{paddingLeft: props.depth + "em"}}>
            <div className={cssStyle.column + " " + cssStyle.columnKey}>{name || props.event}</div>
            {!props.focusEnabled ? undefined :
                <div className={cssStyle.column + " " + cssStyle.columnFocus}>
                    {focusElement}
                </div>
            }
            <div className={cssStyle.column + " " + cssStyle.columnNotification}>
                {notificationElement}
            </div>
            <div className={cssStyle.column + " " + cssStyle.columnLog}>
                {logElement}
            </div>
        </div>
    );
});

const EventTableGroupEntry = (props: { events: Registry<NotificationSettingsEvents>, group: EventGroup, depth: number, focusEnabled: boolean }) => {
    const [collapsed, setCollapsed] = useState(false);

    props.events.reactUse("action_toggle_group", event => {
        if (event.groupKey !== props.group.key)
            return;

        setCollapsed(event.collapsed);
    });

    return <>
        <div className={cssStyle.tableEntry + " " + cssStyle.groupEntry} style={{paddingLeft: props.depth + "em"}}>
            <div className={cssStyle.column + " " + cssStyle.columnKey}>
                <div className={"arrow " + (collapsed ? "right" : "down")}
                     onClick={() => props.events.fire("action_toggle_group", {
                         collapsed: !collapsed,
                         groupKey: props.group.key
                     })}/>
                <a>{props.group.name}</a>
            </div>
            {props.focusEnabled ?
                <div key={"focus"} className={cssStyle.column + " " + cssStyle.columnFocus}/> : undefined}
            <div className={cssStyle.column + " " + cssStyle.columnNotification}/>
            <div className={cssStyle.column + " " + cssStyle.columnLog}/>
        </div>
        {!collapsed && props.group.events?.map(e => <EventTableEntry key={e} events={props.events} event={e}
                                                                     depth={props.depth + 1}
                                                                     focusEnabled={props.focusEnabled}/>)}
        {!collapsed && props.group.subgroups?.map(e => <EventTableGroupEntry key={e.key} events={props.events} group={e}
                                                                             depth={props.depth + 1}
                                                                             focusEnabled={props.focusEnabled}/>)}
    </>;
};

const NoFilterResultsEmpty = (props: { shown: boolean }) => (
    <div className={cssStyle.overlay + " " + (props.shown ? "" : cssStyle.hidden)}>
        <a><Translatable>No events matching your filter</Translatable></a>
    </div>
);

const EventTableBody = (props: { events: Registry<NotificationSettingsEvents>, focusEnabled: boolean }) => {
    const refContainer = useRef<HTMLDivElement>();
    const [events, setEvents] = useState<"loading" | EventGroup[]>(() => {
        props.events.fire("query_events");
        return "loading";
    });

    props.events.reactUse("notify_events", event => setEvents(event.groups));

    return (
        <div className={cssStyle.tableBody} ref={refContainer}>
            {events === "loading" ? undefined :
                events.map(e => <EventTableGroupEntry events={props.events} group={e} key={"event-" + e.key} depth={0}
                                                      focusEnabled={props.focusEnabled}/>)
            }
            <NoFilterResultsEmpty shown={events !== "loading" && events.length === 0}/>
        </div>
    )
};

const EventTable = (props: { events: Registry<NotificationSettingsEvents> }) => {
    const [focusEnabled, setFocusEnabled] = useState(__build.target === "client");

    props.events.reactUse("notify_events", event => {
        if (event.focusEnabled !== focusEnabled)
            setFocusEnabled(event.focusEnabled);
    });

    return (
        <div className={cssStyle.containerTable}>
            <EventTableHeader focus={focusEnabled}/>
            <EventTableBody events={props.events} focusEnabled={focusEnabled}/>
        </div>
    );
};

const EventFilter = (props: { events: Registry<NotificationSettingsEvents> }) => {
    return (
        <div className={cssStyle.containerFilter}>
            <FlatInputField
                className={cssStyle.input}
                label={<Translatable>Filter Events</Translatable>}
                labelType={"floating"}
                onChange={text => props.events.fire_async("action_set_filter", {filter: text})}
            />
        </div>
    )
};

export const NotificationSettings = () => {
    const events = useRef<Registry<NotificationSettingsEvents>>(undefined);

    if (events.current === undefined) {
        events.current = new Registry<NotificationSettingsEvents>();
        initializeController(events.current);
    }

    return (<>
        <div key={"header"} className={cssStyle.header}>
            <a><Translatable>Notifications</Translatable></a>
        </div>
        <div key={"body"} className={cssStyle.body}>
            <EventTable events={events.current}/>
            <EventFilter events={events.current}/>
        </div>
    </>);
};

const knownEventGroups: EventGroup[] = [
    {
        key: "client",
        name: "Client events",
        subgroups: [
            {
                key: "client-messages",
                name: "Messages",
                events: [
                    EventType.CLIENT_POKE_RECEIVED,
                    EventType.CLIENT_POKE_SEND,
                    EventType.PRIVATE_MESSAGE_SEND,
                    EventType.PRIVATE_MESSAGE_RECEIVED
                ]
            },
            {
                key: "client-view",
                name: "View",
                events: [
                    EventType.CLIENT_VIEW_ENTER,
                    EventType.CLIENT_VIEW_ENTER_OWN_CHANNEL,
                    EventType.CLIENT_VIEW_MOVE,
                    EventType.CLIENT_VIEW_MOVE_OWN,
                    EventType.CLIENT_VIEW_MOVE_OWN_CHANNEL,
                    EventType.CLIENT_VIEW_LEAVE,
                    EventType.CLIENT_VIEW_LEAVE_OWN_CHANNEL
                ]
            }
        ]
    },
    {
        key: "server",
        name: "Server",
        events: [
            EventType.GLOBAL_MESSAGE,
            EventType.SERVER_CLOSED,
            EventType.SERVER_BANNED,
        ]
    },
    {
        key: "connection",
        name: "Connection",
        events: [
            EventType.CONNECTION_BEGIN,
            EventType.CONNECTION_CONNECTED,
            EventType.CONNECTION_FAILED
        ]
    }
];

const groupNames: { [key: string]: string } = {};
groupNames[EventType.CLIENT_POKE_RECEIVED] = tr("You received a poke");
groupNames[EventType.CLIENT_POKE_SEND] = tr("You send a poke");
groupNames[EventType.PRIVATE_MESSAGE_SEND] = tr("You received a private message");
groupNames[EventType.PRIVATE_MESSAGE_RECEIVED] = tr("You send a private message");

groupNames[EventType.CLIENT_VIEW_ENTER] = tr("A client enters your view");
groupNames[EventType.CLIENT_VIEW_ENTER_OWN_CHANNEL] = tr("A client enters your view and your channel");

groupNames[EventType.CLIENT_VIEW_MOVE] = tr("A client switches/gets moved/kicked");
groupNames[EventType.CLIENT_VIEW_MOVE_OWN_CHANNEL] = tr("A client switches/gets moved/kicked in to/out of your channel");
groupNames[EventType.CLIENT_VIEW_MOVE_OWN] = tr("You've been moved or kicked");

groupNames[EventType.CLIENT_VIEW_LEAVE] = tr("A client leaves/disconnects of your view");
groupNames[EventType.CLIENT_VIEW_LEAVE_OWN_CHANNEL] = tr("A client leaves/disconnects of your channel");

groupNames[EventType.GLOBAL_MESSAGE] = tr("A server message has been send");
groupNames[EventType.SERVER_CLOSED] = tr("The server has been closed");
groupNames[EventType.SERVER_BANNED] = tr("You've been banned from the server");

groupNames[EventType.CONNECTION_BEGIN] = tr("You're connecting to a server");
groupNames[EventType.CONNECTION_CONNECTED] = tr("You've successfully connected to the server");
groupNames[EventType.CONNECTION_FAILED] = tr("You're connect attempt failed");

function initializeController(events: Registry<NotificationSettingsEvents>) {
    let filter = undefined;

    events.on(["query_events", "action_set_filter"], event => {
        if (event.type === "action_set_filter")
            filter = event.as<"action_set_filter">().filter;

        const groupMapper = (group: EventGroup) => {
            const result = {
                name: group.name,
                events: group.events?.filter(e => {
                    if (!filter)
                        return true;

                    if (e.toLowerCase().indexOf(filter) !== -1)
                        return true;

                    if (!groupNames[e])
                        return false;

                    return groupNames[e].indexOf(filter) !== -1;
                }),
                key: group.key,
                subgroups: group.subgroups?.map(groupMapper).filter(e => !!e)
            } as EventGroup;

            if (!result.subgroups?.length && !result.events?.length)
                return undefined;

            return result;
        };

        events.fire_async("notify_events", {
            groups: knownEventGroups.map(groupMapper).filter(e => !!e),
            focusEnabled: __build.target === "client"
        });
    });
    events.on("query_event_info", event => {
        events.fire_async("notify_event_info", {
            key: event.key,
            name: groupNames[event.key] || event.key,
            log: settings.global(Settings.FN_EVENTS_LOG_ENABLED(event.key), true) ? "enabled" : "disabled",
            notification: getRegisteredNotificationDispatchers().findIndex(e => e as any === event.key) === -1 ? "unavailable" : isNotificationEnabled(event.key as any) ? "enabled" : "disabled",
            focus: isFocusRequestEnabled(event.key as any) ? "enabled" : "disabled"
        });
    });

    events.on("action_set_state", event => {
        switch (event.state) {
            case "log":
                settings.changeGlobal(Settings.FN_EVENTS_LOG_ENABLED(event.key), event.value === "enabled");
                break;

            case "notification":
                settings.changeGlobal(Settings.FN_EVENTS_NOTIFICATION_ENABLED(event.key), event.value === "enabled");
                break;

            case "focus":
                settings.changeGlobal(Settings.FN_EVENTS_FOCUS_ENABLED(event.key), event.value === "enabled");
                break;
        }

        events.fire_async("notify_set_state_result", {
            key: event.key,
            state: event.state,
            value: event.value
        });
    });
}