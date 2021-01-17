import {LogCategory, logTrace, logWarn} from "./log";
import {guid} from "./crypto/uid";
import * as React from "react";
import {useEffect} from "react";
import {unstable_batchedUpdates} from "react-dom";
import { tr } from "./i18n/localize";

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

export interface EventSender<Events extends { [key: string]: any } = { [key: string]: any }> {
    fire<T extends keyof Events>(event_type: T, data?: Events[T], overrideTypeKey?: boolean);

    /**
     * Fire an event later by using setTimeout(..)
     * @param event_type The target event to be fired
     * @param data The payload of the event
     * @param callback The callback will be called after the event has been successfully dispatched
     */
    fire_later<T extends keyof Events>(event_type: T, data?: Events[T], callback?: () => void);

    /**
     * Fire an event, which will be delayed until the next animation frame.
     * This ensures that all react components have been successfully mounted/unmounted.
     * @param event_type The target event to be fired
     * @param data The payload of the event
     * @param callback The callback will be called after the event has been successfully dispatched
     */
    fire_react<T extends keyof Events>(event_type: T, data?: Events[T], callback?: () => void);
}

const event_annotation_key = guid();
export class Registry<Events extends { [key: string]: any } = { [key: string]: any }> implements EventSender<Events> {
    private readonly registryUuid;

    private handler: {[key: string]: ((event) => void)[]} = {};
    private connections: {[key: string]: EventSender<Events>[]} = {};
    private eventHandlerObjects: {
        object: any,
        handlers: {[key: string]: ((event) => void)[]}
    }[] = [];
    private debugPrefix = undefined;
    private warnUnhandledEvents = false;

    private pendingAsyncCallbacks: { type: any, data: any, callback: () => void }[];
    private pendingAsyncCallbacksTimeout: number = 0;

    private pendingReactCallbacks: { type: any, data: any, callback: () => void }[];
    private pendingReactCallbacksFrame: number = 0;

    constructor() {
        this.registryUuid = "evreg_data_" + guid();
    }

    enableDebug(prefix: string) { this.debugPrefix = prefix || "---"; }
    disableDebug() { this.debugPrefix = undefined; }

    enableWarnUnhandledEvents() { this.warnUnhandledEvents = true; }
    disableWarnUnhandledEvents() { this.warnUnhandledEvents = false; }

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
            return () => {
                handlers.remove(handler);
            };
        }, reactEffectDependencies);
    }

    connectAll<EOther, T extends keyof Events & keyof EOther>(target: EventSender<Events>) {
        (this.connections[null as any] || (this.connections[null as any] = [])).push(target as any);
    }

    connect<EOther, T extends (keyof Events & keyof EOther)>(events: T | T[], target: EventSender<EOther>) {
        for(const event of Array.isArray(events) ? events : [events])
            (this.connections[event as string] || (this.connections[event as string] = [])).push(target as any);
    }

    disconnect<EOther, T extends keyof Events & keyof EOther>(events: T | T[], target: EventSender<Events>) {
        for(const event of Array.isArray(events) ? events : [events])
            (this.connections[event as string] || []).remove(target as any);
    }

    disconnectAll<EOther>(target: EventSender<EOther>) {
        this.connections[null as any]?.remove(target as any);
        for(const event of Object.keys(this.connections))
            this.connections[event].remove(target as any);
    }

    fire<T extends keyof Events>(event_type: T, data?: Events[T], overrideTypeKey?: boolean) {
        if(this.debugPrefix)
            logTrace(LogCategory.EVENT_REGISTRY, tr("[%s] Trigger event: %s"), this.debugPrefix, event_type);

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
            logWarn(LogCategory.EVENT_REGISTRY, tr("Event handler (%s) triggered event %s which has no consumers."), this.debugPrefix, type);
        }
    }

    fire_later<T extends keyof Events>(event_type: T, data?: Events[T], callback?: () => void) {
        if(!this.pendingAsyncCallbacksTimeout) {
            this.pendingAsyncCallbacksTimeout = setTimeout(() => this.invokeAsyncCallbacks());
            this.pendingAsyncCallbacks = [];
        }
        this.pendingAsyncCallbacks.push({ type: event_type, data: data, callback: callback });
    }

    fire_react<T extends keyof Events>(event_type: T, data?: Events[T], callback?: () => void) {
        if(!this.pendingReactCallbacks) {
            this.pendingReactCallbacksFrame = requestAnimationFrame(() => this.invokeReactCallbacks());
            this.pendingReactCallbacks = [];
        }
        this.pendingReactCallbacks.push({ type: event_type, data: data, callback: callback });
    }

    private invokeAsyncCallbacks() {
        const callbacks = this.pendingAsyncCallbacks;
        this.pendingAsyncCallbacksTimeout = 0;
        this.pendingAsyncCallbacks = undefined;

        let index = 0;
        while(index < callbacks.length) {
            this.fire(callbacks[index].type, callbacks[index].data);
            try {
                if(callbacks[index].callback) {
                    callbacks[index].callback();
                }
            } catch (error) {
                console.error(error);
                /* TODO: Improve error logging? */
            }
            index++;
        }
    }

    private invokeReactCallbacks() {
        const callbacks = this.pendingReactCallbacks;
        this.pendingReactCallbacksFrame = 0;
        this.pendingReactCallbacks = undefined;

        /* run this after the requestAnimationFrame has been finished since else it might be fired instantly */
        setTimeout(() => {
            /* batch all react updates */
            unstable_batchedUpdates(() => {
                let index = 0;
                while(index < callbacks.length) {
                    this.fire(callbacks[index].type, callbacks[index].data);
                    try {
                        if(callbacks[index].callback) {
                            callbacks[index].callback();
                        }
                    } catch (error) {
                        console.error(error);
                        /* TODO: Improve error logging? */
                    }
                    index++;
                }
            });
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
            logWarn(LogCategory.EVENT_REGISTRY, tr("No events found in event handler which has been registered."));
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
            for(const evhandler of data.handlers[key]) {
                this.off(evhandler);
            }
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

            if(typeof didMount === "function") {
                didMount.call(this, arguments);
            }
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

            if(typeof willUnmount === "function") {
                willUnmount.call(this, arguments);
            }
        };
    }
}

export namespace modal {
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
    }
}