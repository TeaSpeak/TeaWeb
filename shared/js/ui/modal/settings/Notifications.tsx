import * as React from "react";
import {useRef, useState} from "react";
import {Registry} from "tc-shared/events";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {FlatInputField} from "tc-shared/ui/react-elements/InputField";
import {Settings, settings} from "tc-shared/settings";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {Tooltip} from "tc-shared/ui/react-elements/Tooltip";
import {TypeInfo} from "tc-shared/connectionlog/Definitions";
import {
    getRegisteredNotificationDispatchers,
    isNotificationEnabled
} from "tc-shared/connectionlog/DispatcherNotifications";
import {isFocusRequestEnabled} from "tc-shared/connectionlog/DispatcherFocus";

const cssStyle = require("./Notifications.scss");

type NotificationState = "enabled" | "disabled" | "unavailable";

interface EventGroup {
    key: string;
    name: string;

    events?: (keyof TypeInfo)[];
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
        props.events.fire_react("query_event_info", {key: props.event});
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
                onChange={text => props.events.fire_react("action_set_filter", {filter: text})}
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
                    "client.poke.received",
                    "client.poke.send",
                    "private.message.send",
                    "private.message.received"
                ]
            },
            {
                key: "client-view",
                name: "View",
                events: [
                    "client.view.enter",
                    "client.view.enter.own.channel",
                    "client.view.move",
                    "client.view.move.own",
                    "client.view.move.own.channel",
                    "client.view.leave",
                    "client.view.leave.own.channel"
                ]
            }
        ]
    },
    {
        key: "server",
        name: "Server",
        events: [
            "global.message",
            "server.closed",
            "server.banned",
        ]
    },
    {
        key: "connection",
        name: "Connection",
        events: [
            "connection.begin",
            "connection.connected",
            "connection.failed"
        ]
    }
];

const groupNames: { [T in keyof TypeInfo]?: string } = {};
groupNames["client.poke.received"] = tr("You received a poke");
groupNames["client.poke.send"] = tr("You send a poke");
groupNames["private.message.send"] = tr("You received a private message");
groupNames["private.message.received"] = tr("You send a private message");

groupNames["client.view.enter"] = tr("A client enters your view");
groupNames["client.view.enter.own.channel"] = tr("A client enters your view and your channel");

groupNames["client.view.move"] = tr("A client switches/gets moved/kicked");
groupNames["client.view.move.own.channel"] = tr("A client switches/gets moved/kicked in to/out of your channel");
groupNames["client.view.move.own"] = tr("You've been moved or kicked");

groupNames["client.view.leave"] = tr("A client leaves/disconnects of your view");
groupNames["client.view.leave.own.channel"] = tr("A client leaves/disconnects of your channel");

groupNames["global.message"] = tr("A server message has been send");
groupNames["server.closed"] = tr("The server has been closed");
groupNames["server.banned"] = tr("You've been banned from the server");

groupNames["connection.begin"] = tr("You're connecting to a server");
groupNames["connection.connected"] = tr("You've successfully connected to the server");
groupNames["connection.failed"] = tr("You're connect attempt failed");

function initializeController(events: Registry<NotificationSettingsEvents>) {
    let filter = undefined;

    events.on(["query_events", "action_set_filter"], event => {
        if (event.type === "action_set_filter") {
            filter = event.asUnchecked("action_set_filter").filter;
        }

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

        events.fire_react("notify_events", {
            groups: knownEventGroups.map(groupMapper).filter(e => !!e),
            focusEnabled: __build.target === "client"
        });
    });
    events.on("query_event_info", event => {
        events.fire_react("notify_event_info", {
            key: event.key,
            name: groupNames[event.key] || event.key,
            log: settings.getValue(Settings.FN_EVENTS_LOG_ENABLED(event.key), true) ? "enabled" : "disabled",
            notification: getRegisteredNotificationDispatchers().findIndex(e => e as any === event.key) === -1 ? "unavailable" : isNotificationEnabled(event.key as any) ? "enabled" : "disabled",
            focus: isFocusRequestEnabled(event.key as any) ? "enabled" : "disabled"
        });
    });

    events.on("action_set_state", event => {
        switch (event.state) {
            case "log":
                settings.setValue(Settings.FN_EVENTS_LOG_ENABLED(event.key), event.value === "enabled");
                break;

            case "notification":
                settings.setValue(Settings.FN_EVENTS_NOTIFICATION_ENABLED(event.key), event.value === "enabled");
                break;

            case "focus":
                settings.setValue(Settings.FN_EVENTS_FOCUS_ENABLED(event.key), event.value === "enabled");
                break;
        }

        events.fire_react("notify_set_state_result", {
            key: event.key,
            state: event.state,
            value: event.value
        });
    });
}