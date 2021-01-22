import {LogCategory, logTrace} from "./log";
import {guid} from "./crypto/uid";
import * as React from "react";
import {useEffect} from "react";
import {unstable_batchedUpdates} from "react-dom";
import { tr } from "./i18n/localize";

export type EventPayloadObject = {
    [key: string]: EventPayload
} | {
    [key: number]: EventPayload
};

export type EventPayload = string | number | bigint | null | undefined | EventPayloadObject;

export type EventMap<P> = {
    [K in keyof P]: EventPayloadObject & {
        /* prohibit the type attribute on the highest layer (used to identify the event type) */
        type?: never
    }
};

export type Event<P extends EventMap<P>, T extends keyof P> = {
    readonly type: T,

    as<S extends T>(target: S) : Event<P, S>;
    asUnchecked<S extends T>(target: S) : Event<P, S>;
    asAnyUnchecked<S extends keyof P>(target: S) : Event<P, S>;

    /**
     * Return an object containing only the event payload specific key value pairs.
     */
    extractPayload() : P[T];
} & P[T];

namespace EventHelper {
    /**
     * Turn the payload object into a bus event object
     * @param payload
     */
    /* May inline this somehow? A function call seems to be 3% slower */
    export function createEvent<P extends EventMap<P>, T extends keyof P>(type: T, payload?: P[T]) : Event<P, T> {
        if(payload) {
            let event = payload as any as Event<P, T>;
            event.as = as;
            event.asUnchecked = asUnchecked;
            event.asAnyUnchecked = asUnchecked;
            event.extractPayload = extractPayload;
            return event;
        } else {
            return {
                type,
                as,
                asUnchecked,
                asAnyUnchecked: asUnchecked,
                extractPayload
            } as any;
        }
    }

    function extractPayload() {
        const result = Object.assign({}, this);
        delete result["as"];
        delete result["asUnchecked"];
        delete result["asAnyUnchecked"];
        delete result["extractPayload"];
        return result;
    }

    function as(target) {
        if(this.type !== target) {
            throw "Mismatching event type. Expected: " + target + ", Got: " + this.type;
        }

        return this;
    }

    function asUnchecked() {
        return this;
    }
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

export type EventDispatchType = "sync" | "later" | "react";

export interface EventConsumer {
    handleEvent(mode: EventDispatchType, type: string, data: any);
}

interface EventHandlerRegisterData {
    registeredHandler: {[key: string]: ((event) => void)[]}
}

const kEventAnnotationKey = guid();
export class Registry<Events extends { [key: string]: any } = { [key: string]: any }> implements EventSender<Events> {
    protected readonly registryUniqueId;

    protected persistentEventHandler: { [key: string]: ((event) => void)[] } = {};
    protected oneShotEventHandler: { [key: string]: ((event) => void)[] } = {};
    protected genericEventHandler: ((event) => void)[] = [];
    protected consumer: EventConsumer[] = [];

    private debugPrefix = undefined;
    private warnUnhandledEvents = false;

    private pendingAsyncCallbacks: { type: any, data: any, callback: () => void }[];
    private pendingAsyncCallbacksTimeout: number = 0;

    private pendingReactCallbacks: { type: any, data: any, callback: () => void }[];
    private pendingReactCallbacksFrame: number = 0;

    constructor() {
        this.registryUniqueId = "evreg_data_" + guid();
    }

    destroy() {
        Object.values(this.persistentEventHandler).forEach(handlers => handlers.splice(0, handlers.length));
        Object.values(this.oneShotEventHandler).forEach(handlers => handlers.splice(0, handlers.length));
        this.genericEventHandler.splice(0, this.genericEventHandler.length);
        this.consumer.splice(0, this.consumer.length);
    }

    enableDebug(prefix: string) { this.debugPrefix = prefix || "---"; }
    disableDebug() { this.debugPrefix = undefined; }

    enableWarnUnhandledEvents() { this.warnUnhandledEvents = true; }
    disableWarnUnhandledEvents() { this.warnUnhandledEvents = false; }

    fire<T extends keyof Events>(eventType: T, data?: Events[T], overrideTypeKey?: boolean) {
        if(this.debugPrefix) {
            logTrace(LogCategory.EVENT_REGISTRY, tr("[%s] Trigger event: %s"), this.debugPrefix, eventType);
        }

        if(typeof data === "object" && 'type' in data && !overrideTypeKey) {
            if((data as any).type !== eventType) {
                debugger;
                throw tr("The keyword 'type' is reserved for the event type and should not be passed as argument");
            }
        }

        for(const consumer of this.consumer) {
            consumer.handleEvent("sync", eventType as string, data);
        }

        this.doInvokeEvent(EventHelper.createEvent(eventType, data));
    }

    fire_later<T extends keyof Events>(eventType: T, data?: Events[T], callback?: () => void) {
        if(!this.pendingAsyncCallbacksTimeout) {
            this.pendingAsyncCallbacksTimeout = setTimeout(() => this.invokeAsyncCallbacks());
            this.pendingAsyncCallbacks = [];
        }
        this.pendingAsyncCallbacks.push({ type: eventType, data: data, callback: callback });

        for(const consumer of this.consumer) {
            consumer.handleEvent("later", eventType as string, data);
        }
    }

    fire_react<T extends keyof Events>(eventType: T, data?: Events[T], callback?: () => void) {
        if(!this.pendingReactCallbacks) {
            this.pendingReactCallbacksFrame = requestAnimationFrame(() => this.invokeReactCallbacks());
            this.pendingReactCallbacks = [];
        }

        this.pendingReactCallbacks.push({ type: eventType, data: data, callback: callback });

        for(const consumer of this.consumer) {
            consumer.handleEvent("react", eventType as string, data);
        }
    }

    on<T extends keyof Events>(event: T | T[], handler: (event: Event<Events, T>) => void) : () => void;
    on(events, handler) : () => void {
        if(!Array.isArray(events)) {
            events = [events];
        }

        for(const event of events as string[]) {
            const persistentHandler = this.persistentEventHandler[event] || (this.persistentEventHandler[event] = []);
            persistentHandler.push(handler);
        }

        return () => this.off(events, handler);
    }

    one<T extends keyof Events>(event: T | T[], handler: (event: Event<Events, T>) => void) : () => void;
    one(events, handler) : () => void {
        if(!Array.isArray(events)) {
            events = [events];
        }

        for(const event of events as string[]) {
            const persistentHandler = this.oneShotEventHandler[event] || (this.oneShotEventHandler[event] = []);
            persistentHandler.push(handler);
        }

        return () => this.off(events, handler);
    }

    off(handler: (event: Event<Events, keyof Events>) => void);
    off<T extends keyof Events>(events: T | T[], handler: (event: Event<Events, T>) => void);
    off(handlerOrEvents, handler?) {
        if(typeof handlerOrEvents === "function") {
            this.offAll(handler);
        } else if(typeof handlerOrEvents === "string") {
            if(this.persistentEventHandler[handlerOrEvents]) {
                this.persistentEventHandler[handlerOrEvents].remove(handler);
            }

            if(this.oneShotEventHandler[handlerOrEvents]) {
                this.oneShotEventHandler[handlerOrEvents].remove(handler);
            }
        } else if(Array.isArray(handlerOrEvents)) {
            handlerOrEvents.forEach(handler_or_event => this.off(handler_or_event, handler));
        }
    }

    onAll(handler: (event: Event<Events, keyof Events>) => void): () => void {
        this.genericEventHandler.push(handler);
        return () => this.genericEventHandler.remove(handler);
    }

    offAll(handler: (event: Event<Events, keyof Events>) => void) {
        Object.values(this.persistentEventHandler).forEach(persistentHandler => persistentHandler.remove(handler));
        Object.values(this.oneShotEventHandler).forEach(oneShotHandler => oneShotHandler.remove(handler));
        this.genericEventHandler.remove(handler);
    }

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

        const handlers = this.persistentEventHandler[event as any] || (this.persistentEventHandler[event as any] = []);

        useEffect(() => {
            handlers.push(handler);
            return () => {
                const index = handlers.findIndex(handler);
                if(index !== -1) {
                    handlers.splice(index, 1);
                }
            };
        }, reactEffectDependencies);
    }

    private doInvokeEvent(event: Event<Events, keyof Events>) {
        const oneShotHandler = this.oneShotEventHandler[event.type];
        if(oneShotHandler) {
            delete this.oneShotEventHandler[event.type];
            for(const handler of oneShotHandler) {
                handler(event);
            }
        }

        for(const handler of this.persistentEventHandler[event.type] || []) {
            handler(event);
        }

        for(const handler of this.genericEventHandler) {
            handler(event);
        }
        /*
        let invokeCount = 0;
        if(this.warnUnhandledEvents && invokeCount === 0) {
            logWarn(LogCategory.EVENT_REGISTRY, tr("Event handler (%s) triggered event %s which has no consumers."), this.debugPrefix, event.type);
        }
        */
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

    registerHandler(handler: any, parentClasses?: boolean) {
        if(typeof handler !== "object") {
            throw "event handler must be an object";
        }

        if(typeof handler[this.registryUniqueId] !== "undefined") {
            throw "event handler already registered";
        }

        const prototype = Object.getPrototypeOf(handler);
        if(typeof prototype !== "object") {
            throw "event handler must have a prototype";
        }

        const data = handler[this.registryUniqueId] = {
            registeredHandler: {}
        } as EventHandlerRegisterData;

        let currentPrototype = prototype;
        do {
            Object.getOwnPropertyNames(currentPrototype).forEach(functionName => {
                if(functionName === "constructor") {
                    return;
                }

                if(typeof prototype[functionName] !== "function") {
                    return;
                }

                if(typeof prototype[functionName][kEventAnnotationKey] !== "object") {
                    return;
                }

                const eventData = prototype[functionName][kEventAnnotationKey];
                const eventHandler = event => prototype[functionName].call(handler, event);
                for(const event of eventData.events) {
                    const registeredHandler = data.registeredHandler[event] || (data.registeredHandler[event] = []);
                    registeredHandler.push(eventHandler);

                    this.on(event, eventHandler);
                }
            });

            if(!parentClasses) {
                break;
            }
        } while ((currentPrototype = Object.getPrototypeOf(currentPrototype)));
    }

    unregisterHandler(handler: any) {
        if(typeof handler !== "object") {
            throw "event handler must be an object";
        }

        if(typeof handler[this.registryUniqueId] === "undefined") {
            throw "event handler not registered";
        }

        const data = handler[this.registryUniqueId] as EventHandlerRegisterData;
        delete handler[this.registryUniqueId];

        for(const event of Object.keys(data.registeredHandler)) {
            for(const handler of data.registeredHandler[event]) {
                this.off(event, handler);
            }
        }
    }

    registerConsumer(consumer: EventConsumer) : () => void {
        const allConsumer = this.consumer;
        allConsumer.push(consumer);

        return () => allConsumer.remove(consumer);
    }

    unregisterConsumer(consumer: EventConsumer) {
        this.consumer.remove(consumer);
    }
}

export type RegistryMap = {[key: string]: any /* can't use Registry here since the template parameter is missing */ };

export function EventHandler<EventTypes>(events: (keyof EventTypes) | (keyof EventTypes)[]) {
    return function (target: any,
                     propertyKey: string,
                     _descriptor: PropertyDescriptor) {
        if(typeof target[propertyKey] !== "function")
            throw "Invalid event handler annotation. Expected to be on a function type.";

        target[propertyKey][kEventAnnotationKey] = {
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
            registry.registerHandler(this);

            if(typeof didMount === "function") {
                didMount.call(this, arguments);
            }
        };

        const willUnmount = constructor.prototype.componentWillUnmount;
        constructor.prototype.componentWillUnmount = function () {
            const registry = registry_callback(this);
            if(!registry) throw "Event registry returned for an event object is invalid";
            try {
                registry.unregisterHandler(this);
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