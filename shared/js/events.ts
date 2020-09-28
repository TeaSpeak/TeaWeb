import * as log from "./log";
import {LogCategory} from "./log";
import {guid} from "./crypto/uid";
import * as React from "react";
import {useEffect} from "react";
import {unstable_batchedUpdates} from "react-dom";
import {ext} from "twemoji";

export interface Event<Events, T = keyof Events> {
    readonly type: T;
    as<T extends keyof Events>() : Events[T];
}

export interface SingletonEvents {
    "singletone-instance": never;
}

export class SingletonEvent implements Event<SingletonEvents, "singletone-instance"> {
    static readonly instance = new SingletonEvent();

    readonly type = "singletone-instance";
    private constructor() { }
    as<T extends keyof SingletonEvents>() : SingletonEvents[T] { return; }
}

export interface EventReceiver<Events extends { [key: string]: any } = { [key: string]: any }> {
    fire<T extends keyof Events>(event_type: T, data?: Events[T], overrideTypeKey?: boolean);
    fire_async<T extends keyof Events>(event_type: T, data?: Events[T], callback?: () => void);
}

const event_annotation_key = guid();
export class Registry<Events extends { [key: string]: any } = { [key: string]: any }> implements EventReceiver<Events> {
    private readonly registryUuid;

    private handler: {[key: string]: ((event) => void)[]} = {};
    private connections: {[key: string]: EventReceiver<Events>[]} = {};
    private eventHandlerObjects: {
        object: any,
        handlers: {[key: string]: ((event) => void)[]}
    }[] = [];
    private debugPrefix = undefined;
    private warnUnhandledEvents = false;

    private pendingCallbacks: { type: any, data: any }[] = [];
    private pendingCallbacksTimeout: number = 0;

    constructor() {
        this.registryUuid = "evreg_data_" + guid();
    }


    enableDebug(prefix: string) { this.debugPrefix = prefix || "---"; }
    disableDebug() { this.debugPrefix = undefined; }

    enable_warn_unhandled_events() { this.warnUnhandledEvents = true; }
    disable_warn_unhandled_events() { this.warnUnhandledEvents = false; }

    on<T extends keyof Events>(event: T, handler: (event?: Events[T] & Event<Events, T>) => void) : () => void;
    on(events: (keyof Events)[], handler: (event?: Event<Events, keyof Events>) => void) : () => void;
    on(events, handler) : () => void {
        if(!Array.isArray(events))
            events = [events];

        handler[this.registryUuid] = {
            singleshot: false
        };
        for(const event of events) {
            const handlers = this.handler[event] || (this.handler[event] = []);
            handlers.push(handler);
        }
        return () => this.off(events, handler);
    }

    onAll(handler: (event?: Event<Events>) => void) : () => void {
        handler[this.registryUuid] = {
            singleshot: false
        };
        (this.handler[null as any] || (this.handler[null as any] = [])).push(handler);
        return () => this.offAll(handler);
    }

    /* one */
    one<T extends keyof Events>(event: T, handler: (event?: Events[T] & Event<Events, T>) => void) : () => void;
    one(events: (keyof Events)[], handler: (event?: Event<Events, keyof Events>) => void) : () => void;
    one(events, handler) : () => void {
        if(!Array.isArray(events))
            events = [events];

        for(const event of events) {
            const handlers = this.handler[event] || (this.handler[event] = []);

            handler[this.registryUuid] = { singleshot: true };
            handlers.push(handler);
        }
        return () => this.off(events, handler);
    }

    off<T extends keyof Events>(handler: (event?) => void);
    off<T extends keyof Events>(event: T, handler: (event?: Events[T] & Event<Events, T>) => void);
    off(event: (keyof Events)[], handler: (event?: Event<Events, keyof Events>) => void);
    off(handler_or_events, handler?) {
        if(typeof handler_or_events === "function") {
            for(const key of Object.keys(this.handler))
                this.handler[key].remove(handler_or_events);
        } else {
            if(!Array.isArray(handler_or_events))
                handler_or_events = [handler_or_events];

            for(const event of handler_or_events) {
                const handlers = this.handler[event];
                if(handlers) handlers.remove(handler);
            }
        }
    }

    offAll(handler: (event?: Event<Events>) => void) {
        (this.handler[null as any] || []).remove(handler);
    }


    /* special helper methods for react components */
    /**
     * @param event
     * @param handler
     * @param condition
     * @param reactEffectDependencies
     */
    reactUse<T extends keyof Events>(event: T, handler: (event?: Events[T] & Event<Events, T>) => void, condition?: boolean, reactEffectDependencies?: any[]) {
        if(typeof condition === "boolean" && !condition) {
            useEffect(() => {});
            return;
        }
        const handlers = this.handler[event as any] || (this.handler[event as any] = []);
        useEffect(() => {
            handlers.push(handler);
            return () => handlers.remove(handler);
        }, reactEffectDependencies);
    }

    connectAll<EOther, T extends keyof Events & keyof EOther>(target: EventReceiver<Events>) {
        (this.connections[null as any] || (this.connections[null as any] = [])).push(target as any);
    }

    connect<EOther, T extends (keyof Events & keyof EOther)>(events: T | T[], target: EventReceiver<EOther>) {
        for(const event of Array.isArray(events) ? events : [events])
            (this.connections[event as string] || (this.connections[event as string] = [])).push(target as any);
    }

    disconnect<EOther, T extends keyof Events & keyof EOther>(events: T | T[], target: EventReceiver<Events>) {
        for(const event of Array.isArray(events) ? events : [events])
            (this.connections[event as string] || []).remove(target as any);
    }

    disconnectAll<EOther>(target: EventReceiver<EOther>) {
        this.connections[null as any]?.remove(target as any);
        for(const event of Object.keys(this.connections))
            this.connections[event].remove(target as any);
    }

    fire<T extends keyof Events>(event_type: T, data?: Events[T], overrideTypeKey?: boolean) {
        if(this.debugPrefix)
            log.trace(LogCategory.EVENT_REGISTRY, tr("[%s] Trigger event: %s"), this.debugPrefix, event_type);

        if(typeof data === "object" && 'type' in data && !overrideTypeKey) {
            if((data as any).type !== event_type) {
                debugger;
                throw tr("The keyword 'type' is reserved for the event type and should not be passed as argument");
            }
        }
        const event = Object.assign(typeof data === "undefined" ? SingletonEvent.instance : data, {
            type: event_type,
            as: function () { return this; }
        });

        this.fire_event(event_type, event);
    }

    private fire_event(type: keyof Events, data: any) {
        let invokeCount = 0;

        const typedHandler = this.handler[type as string] || [];
        const generalHandler = this.handler[null as string] || [];
        for(const handler of [...generalHandler, ...typedHandler]) {
            handler(data);
            invokeCount++;

            const regData = handler[this.registryUuid];
            if(typeof regData === "object" && regData.singleshot)
                this.handler[type as string].remove(handler); /* FIXME: General single shot? */
        }

        const typedConnections = this.connections[type as string] || [];
        const generalConnections = this.connections[null as string] || [];
        for(const evhandler of [...generalConnections, ...typedConnections]) {
            if('fire_event' in evhandler)
                /* evhandler is an event registry as well. We don't have to check for any inappropriate keys */
                (evhandler as any).fire_event(type, data);
            else
                evhandler.fire(type, data);
            invokeCount++;
        }
        if(this.warnUnhandledEvents && invokeCount === 0) {
            log.warn(LogCategory.EVENT_REGISTRY, tr("Event handler (%s) triggered event %s which has no consumers."), this.debugPrefix, type);
        }
    }

    fire_async<T extends keyof Events>(event_type: T, data?: Events[T], callback?: () => void) {
        if(!this.pendingCallbacksTimeout) {
            this.pendingCallbacksTimeout = setTimeout(() => this.invokeAsyncCallbacks());
            this.pendingCallbacks = [];
        }
        this.pendingCallbacks.push({ type: event_type, data: data });
    }

    private invokeAsyncCallbacks() {
        const callbacks = this.pendingCallbacks;
        this.pendingCallbacksTimeout = 0;
        this.pendingCallbacks = undefined;

        unstable_batchedUpdates(() => {
            let index = 0;
            while(index < callbacks.length) {
                this.fire(callbacks[index].type, callbacks[index].data);
                index++;
            }
        });
    }

    destroy() {
        this.handler = {};
        this.connections = {};
        this.eventHandlerObjects = [];
    }

    register_handler(handler: any, parentClasses?: boolean) {
        if(typeof handler !== "object")
            throw "event handler must be an object";

        const proto = Object.getPrototypeOf(handler);
        if(typeof proto !== "object")
            throw "event handler must have a prototype";

        let currentPrototype = proto;
        let registered_events = {};
        do {
            Object.getOwnPropertyNames(currentPrototype).forEach(function_name => {
                if(function_name === "constructor")
                    return;

                if(typeof proto[function_name] !== "function")
                    return;

                if(typeof proto[function_name][event_annotation_key] !== "object")
                    return;

                const event_data = proto[function_name][event_annotation_key];
                const ev_handler = event => proto[function_name].call(handler, event);
                for(const event of event_data.events) {
                    registered_events[event] = registered_events[event] || [];
                    registered_events[event].push(ev_handler);
                    this.on(event, ev_handler);
                }
            });

            if(!parentClasses)
                break;
        } while ((currentPrototype = Object.getPrototypeOf(currentPrototype)));
        if(Object.keys(registered_events).length === 0) {
            log.warn(LogCategory.EVENT_REGISTRY, tr("No events found in event handler which has been registered."));
            return;
        }

        this.eventHandlerObjects.push({
            handlers: registered_events,
            object: handler
        });
    }

    unregister_handler(handler: any) {
        const data = this.eventHandlerObjects.find(e => e.object === handler);
        if(!data) return;

        this.eventHandlerObjects.remove(data);

        for(const key of Object.keys(data.handlers)) {
            for(const evhandler of data.handlers[key])
                this.off(evhandler);
        }
    }
}

export type RegistryMap = {[key: string]: any /* can't use Registry here since the template parameter is missing */ };

export function EventHandler<EventTypes>(events: (keyof EventTypes) | (keyof EventTypes)[]) {
    return function (target: any,
                     propertyKey: string,
                     descriptor: PropertyDescriptor) {
        if(typeof target[propertyKey] !== "function")
            throw "Invalid event handler annotation. Expected to be on a function type.";

        target[propertyKey][event_annotation_key] = {
            events: Array.isArray(events) ? events : [events]
        };
    }
}

export function ReactEventHandler<ObjectClass = React.Component<any, any>, EventTypes = any>(registry_callback: (object: ObjectClass) => Registry<EventTypes>) {
    return function (constructor: Function) {
        if(!React.Component.prototype.isPrototypeOf(constructor.prototype))
            throw "Class/object isn't an instance of React.Component";

        const didMount = constructor.prototype.componentDidMount;
        constructor.prototype.componentDidMount = function() {
            const registry = registry_callback(this);
            if(!registry) throw "Event registry returned for an event object is invalid";
            registry.register_handler(this);

            if(typeof didMount === "function")
                didMount.call(this, arguments);
        };

        const willUnmount = constructor.prototype.componentWillUnmount;
        constructor.prototype.componentWillUnmount = function () {
            const registry = registry_callback(this);
            if(!registry) throw "Event registry returned for an event object is invalid";
            try {
                registry.unregister_handler(this);
            } catch (error) {
                console.warn("Failed to unregister event handler: %o", error);
            }

            if(typeof willUnmount === "function")
                willUnmount.call(this, arguments);
        };
    }
}

export namespace modal {
    export type BotStatusType = "name" | "description" | "volume" | "country_code" | "channel_commander" | "priority_speaker";
    export type PlaylistStatusType = "replay_mode" | "finished" | "delete_played" | "max_size" | "notify_song_change";
    export interface music_manage {
        show_container: { container: "settings" | "permissions"; };

        /* setting relevant */
        query_bot_status: {},
        bot_status: {
            status: "success" | "error";
            error_msg?: string;
            data?: {
                name: string,
                description: string,
                volume: number,

                country_code: string,
                default_country_code: string,

                channel_commander: boolean,
                priority_speaker: boolean,

                client_version: string,
                client_platform: string,

                uptime_mode: number,
                bot_type: number
            }
        },
        set_bot_status: {
            key: BotStatusType,
            value: any
        },
        set_bot_status_result: {
            key: BotStatusType,
            status: "success" | "error" | "timeout",
            error_msg?: string,
            value?: any
        }

        query_playlist_status: {},
        playlist_status: {
            status: "success" | "error",
            error_msg?: string,
            data?: {
                replay_mode: number,
                finished: boolean,
                delete_played: boolean,
                max_size: number,
                notify_song_change: boolean
            }
        },
        set_playlist_status: {
            key: PlaylistStatusType,
            value: any
        },
        set_playlist_status_result: {
            key: PlaylistStatusType,
            status: "success" | "error" | "timeout",
            error_msg?: string,
            value?: any
        }

        /* permission relevant */
        show_client_list: {},
        hide_client_list: {},

        filter_client_list: { filter: string | undefined },

        "refresh_permissions": {},

        query_special_clients: {},
        special_client_list: {
            status: "success" | "error" | "error-permission",
            error_msg?: string,
            clients?: {
                name: string,
                unique_id: string,
                database_id: number
            }[]
        },

        search_client: { text: string },
        search_client_result: {
            status: "error" | "timeout" | "empty" | "success",
            error_msg?: string,
            client?: {
                name: string,
                unique_id: string,
                database_id: number
            }
        },

        /* sets a client to set the permission for */
        special_client_set: {
            client?: {
                name: string,
                unique_id: string,
                database_id: number
            }
        },

        "query_general_permissions": {},
        "general_permissions": {
            status: "error" | "timeout" | "success",
            error_msg?: string,
            permissions?: {[key: string]:number}
        },
        "set_general_permission_result": {
            status: "error" | "success",
            key: string,
            value?: number,
            error_msg?: string
        },
        "set_general_permission": { /* try to change a permission for the server */
            key: string,
            value: number
        },


        "query_client_permissions": { client_database_id: number },
        "client_permissions": {
            status: "error" | "timeout" | "success",
            client_database_id: number,
            error_msg?: string,
            permissions?: {[key: string]:number}
        },
        "set_client_permission_result": {
            status: "error" | "success",
            client_database_id: number,
            key: string,
            value?: number,
            error_msg?: string
        },
        "set_client_permission": { /* try to change a permission for the server */
            client_database_id: number,
            key: string,
            value: number
        },

        "query_group_permissions": { permission_name: string },
        "group_permissions": {
            permission_name: string;
            status: "error" | "timeout" | "success"
            groups?: {
                name: string,
                value: number,
                id: number
            }[],
            error_msg?: string
        }
    }

    export namespace settings {
        export type ProfileInfo = {
            id: string,
            name: string,
            nickname: string,
            identity_type: "teaforo" | "teamspeak" | "nickname",

            identity_forum?: {
                valid: boolean,
                fallback_name: string
            },
            identity_nickname?: {
                name: string,
                fallback_name: string
            },
            identity_teamspeak?: {
                unique_id: string,
                fallback_name: string
            }
        }

        export interface profiles {
            "reload-profile": { profile_id?: string },
            "select-profile": { profile_id: string },

            "query-profile-list": { },
            "query-profile-list-result": {
                status: "error" | "success" | "timeout",

                error?: string;
                profiles?: ProfileInfo[]
            }

            "query-profile": { profile_id: string },
            "query-profile-result": {
                status: "error" | "success" | "timeout",
                profile_id: string,

                error?: string;
                info?: ProfileInfo
            },

            "select-identity-type": {
                profile_id: string,
                identity_type: "teamspeak" | "teaforo" | "nickname" | "unset"
            },

            "query-profile-validity": { profile_id: string },
            "query-profile-validity-result": {
                profile_id: string,
                status: "error" | "success" | "timeout",

                error?: string,
                valid?: boolean
            }

            "create-profile": { name: string },
            "create-profile-result": {
                status: "error" | "success" | "timeout",
                name: string;

                profile_id?: string;
                error?: string;
            },

            "delete-profile": { profile_id: string },
            "delete-profile-result": {
                status: "error" | "success" | "timeout",
                profile_id: string,
                error?: string
            }

            "set-default-profile": { profile_id: string },
            "set-default-profile-result": {
                status: "error" | "success" | "timeout",

                /* the profile which now has the id "default" */
                old_profile_id: string,

                /* the "default" profile which now has a new id */
                new_profile_id?: string

                error?: string;
            }

            /* profile name events */
            "set-profile-name": {
                profile_id: string,
                name: string
            },
            "set-profile-name-result": {
                status: "error" | "success" | "timeout",
                profile_id: string,
                name?: string
            },

            /* profile nickname events */
            "set-default-name": {
                profile_id: string,
                name: string | null
            },
            "set-default-name-result": {
                status: "error" | "success" | "timeout",
                profile_id: string,
                name?: string | null
            },

            "query-identity-teamspeak": { profile_id: string },
            "query-identity-teamspeak-result": {
                status: "error" | "success" | "timeout",
                profile_id: string,

                error?: string,
                level?: number
            }

            "set-identity-name-name": { profile_id: string, name: string },
            "set-identity-name-name-result": {
                status: "error" | "success" | "timeout",
                profile_id: string,

                error?: string,
                name?: string
            },

            "generate-identity-teamspeak": { profile_id: string },
            "generate-identity-teamspeak-result": {
                profile_id: string,
                status: "error" | "success" | "timeout",

                error?: string,

                level?: number
                unique_id?: string
            },

            "improve-identity-teamspeak-level": { profile_id: string },
            "improve-identity-teamspeak-level-update": {
                profile_id: string,
                new_level: number
            },

            "import-identity-teamspeak": { profile_id: string },
            "import-identity-teamspeak-result": {
                profile_id: string,

                level?: number
                unique_id?: string
            }

            "export-identity-teamspeak": {
                profile_id: string,
                filename: string
            },


            "setup-forum-connection": {}
        }

        export type MicrophoneSettings = "volume" | "vad-type" | "ppt-key" | "ppt-release-delay" | "ppt-release-delay-active" | "threshold-threshold";
        export interface microphone {
            "query-devices": { refresh_list: boolean },
            "query-device-result": {
                status: "success" | "error" | "timeout",

                error?: string,
                devices?: {
                    id: string,
                    name: string,
                    driver: string
                }[]
                active_device?: string;
            },

            "query-settings": {},
            "query-settings-result": {
                status: "success" | "error" | "timeout",

                error?: string,
                info?: {
                    volume: number,
                    vad_type: string,

                    vad_ppt: {
                        key: any, /* ppt.KeyDescriptor */
                        release_delay: number,
                        release_delay_active: boolean
                    },
                    vad_threshold: {
                        threshold: number
                    }
                }
            },

            "set-device": { device_id: string },
            "set-device-result": {
                device_id: string,
                status: "success" | "error" | "timeout",

                error?: string
            },

            "set-setting": {
                setting: MicrophoneSettings;
                value: any;
            },
            "set-setting-result": {
                setting: MicrophoneSettings,
                status: "success" | "error" | "timeout",

                error?: string,
                value?: any
            },

            "update-device-level": {
                devices: {
                    device_id: string,
                    status: "success" | "error",

                    level?: number,
                    error?: string
                }[]
            },

            "audio-initialized": {},
            "deinitialize": {}
        }
    }
}