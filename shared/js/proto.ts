/* setup jsrenderer */
import "jsrender";
import {tr} from "./i18n/localize";
import {LogCategory, logTrace} from "tc-shared/log";

if(__build.target === "web") {
    (window as any).$ = require("jquery");
    (window as any).jQuery = $;

    require("jsrender")($);
}

declare global {
    function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
    function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;

    interface Array<T> {
        remove(elem?: T): boolean;
        last?(): T;

        pop_front(): T | undefined;

        /**
         * @param entry The entry to toggle
         * @returns `true` if the entry has been inserted and false if the entry has been deleted
         */
        toggle(entry: T) : boolean;

        /**
         * @param entry The entry to toggle
         * @param insert Whatever the entry should be in the array or not
         * @returns `true` if the array has been modified
         */
        toggle(entry: T, insert: boolean);
    }

    interface JSON {
        map_to<T>(object: T, json: any, variables?: string | string[], validator?: (map_field: string, map_value: string) => boolean, variable_direction?: number) : number;
        map_field_to<T>(object: T, value: any, field: string) : boolean;
    }

    type JQueryScrollType = "height" | "width";
    interface JQuery<TElement = HTMLElement> {
        renderTag(values?: any) : JQuery<TElement>;
        hasScrollBar(direction?: JQueryScrollType) : boolean;


        visible_height() : number;
        visible_width() : number;

        /* first element which matches the selector, could be the element itself or a parent */
        firstParent(selector: string) : JQuery;
    }

    interface JQueryStatic<TElement extends Node = HTMLElement> {
        spawn<K extends keyof HTMLElementTagNameMap>(tagName: K): JQuery<HTMLElementTagNameMap[K]>;
    }

    interface Window {
        __REACT_DEVTOOLS_GLOBAL_HOOK__: any;

        readonly webkitAudioContext: typeof AudioContext;
        readonly AudioContext: typeof OfflineAudioContext;
        readonly OfflineAudioContext: typeof OfflineAudioContext;
        readonly webkitOfflineAudioContext: typeof OfflineAudioContext;
        readonly RTCPeerConnection: typeof RTCPeerConnection;
        readonly Pointer_stringify: any;

        readonly require: typeof require;
    }
    const __non_webpack_require__: typeof require;

    interface Navigator {
        browserSpecs: {
            name: string,
            version: string
        };

        mozGetUserMedia(constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback): void;
        webkitGetUserMedia(constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback): void;
    }

    interface ObjectConstructor {
        isSimilar(a: any, b: any): boolean;
    }
}

if(!Object.isSimilar) {
    Object.isSimilar = function (a, b) {
        const aType = typeof a;
        const bType = typeof b;
        if (aType !== bType) {
            return false;
        }

        if (aType === "object") {
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            if(aKeys.length != bKeys.length) { return false; }
            if(aKeys.findIndex(key => bKeys.indexOf(key) !== -1) !== -1) { return false; }
            return aKeys.findIndex(key => !Object.isSimilar(a[key], b[key])) === -1;
        } else {
            return a === b;
        }
    };
}

if(!JSON.map_to) {
    JSON.map_to = function <T>(object: T, json: any, variables?: string | string[], validator?: (map_field: string, map_value: string) => boolean, variable_direction?: number): number {
        if (!validator)
            validator = () => true;

        if (!variables) {
            variables = [];

            if (!variable_direction || variable_direction == 0) {
                for (let field of Object.keys(json))
                    variables.push(field);
            } else if (variable_direction == 1) {
                for (let field of Object.keys(json))
                    variables.push(field);
            }
        } else if (!Array.isArray(variables)) {
            variables = [variables];
        }

        let updates = 0;
        for (let field of variables) {
            if (typeof json[field] === "undefined") {
                logTrace(LogCategory.GENERAL, tr("Json does not contains %s"), field);
                continue;
            }
            if (!validator(field, json[field])) {
                logTrace(LogCategory.GENERAL, tr("Validator results in false for %s"), field);
                continue;
            }

            if(JSON.map_field_to(object, json[field], field))
                updates++;
        }
        return updates;
    }
}

if(!JSON.map_field_to) {
    JSON.map_field_to = function<T>(object: T, value: any, field: string) : boolean {
        let fieldType = typeof object[field];
        let newValue;
        if(fieldType == "string" || fieldType == "object" || fieldType == "undefined") {
            newValue = value;
        } else if(fieldType == "number") {
            newValue = parseFloat(value);
        } else if(fieldType == "boolean") {
            newValue = typeof value === "boolean" && value || value === "1" || value === "true";
        } else {
            console.warn(tr("Invalid object type %s for entry %s"), fieldType, field);
            return false;
        }

        if(newValue === object[field]) {
            return false;
        }

        object[field] = newValue;
        return true;
    }
}

if (!Array.prototype.remove) {
    Array.prototype.remove = function<T>(elem?: T): boolean {
        const index = this.indexOf(elem);
        if (index > -1) {
            this.splice(index, 1);
            return true;
        }
        return false;
    }
}

if (!Array.prototype.pop_front) {
    Array.prototype.pop_front = function<T>(): T {
        if(this.length == 0) return undefined;
        return this.splice(0, 1)[0];
    }
}

if (!Array.prototype.toggle) {
    Array.prototype.toggle = function<T>(element: T, insert?: boolean): boolean {
        const index = this.findIndex(e => e === element);
        if((index !== -1) === insert) {
            return false;
        } else if(index === -1) {
            this.push(element);
            return true;
        } else {
            this.splice(index, 1);
            return typeof insert === "boolean";
        }
    }
}

if (!Array.prototype.last){
    Array.prototype.last = function(){
        if(this.length == 0) return undefined;
        return this[this.length - 1];
    };
}

if(typeof ($) !== "undefined") {
    if(!$.spawn) {
        $.spawn = function<K extends keyof HTMLElementTagNameMap>(tagName: K): JQuery<HTMLElementTagNameMap[K]> {
            return $(document.createElement(tagName) as any);
        }
    }

    if(!$.fn.renderTag) {
        $.fn.renderTag = function (this: JQuery, values?: any) : JQuery {
            let result;
            if(this.render) {
                result = $(this.render(values));
            } else {
                const template = jsrender.render[this.attr("id")];
                if(!template) {
                    console.error("Tried to render template %o, but template is not available!", this.attr("id"));
                    throw "missing template " + this.attr("id");
                }
                /*
                result = window.jsrender.templates("tmpl_permission_entry", $("#tmpl_permission_entry").html());
                result = window.jsrender.templates("xxx", this.html());
                */
                result = template(values);
                result = $(result);
            }
            result.find("node").each((index, element) => {
                $(element).replaceWith(values[$(element).attr("key")] || (values[0] || [])[$(element).attr("key")]);
            });
            return result;
        }
    }
    if(!$.fn.hasScrollBar)
        $.fn.hasScrollBar = function(direction?: "height" | "width") {
            if(this.length <= 0)
                return false;

            const scroll_height = this.get(0).scrollHeight > this.height();
            const scroll_width = this.get(0).scrollWidth > this.width();

            if(typeof(direction) === "string") {
                if(direction === "height")
                    return scroll_height;
                if(direction === "width")
                    return scroll_width;
            }
            return scroll_width || scroll_height;
        };

    if(!$.fn.visible_height)
        $.fn.visible_height = function (this: JQuery<HTMLElement>) {
            const original_style = this.attr("style");
            this.css({
                position:   'absolute!important',
                visibility: 'hidden!important',
                display:    'block!important'
            });

            const result = this.height();
            this.attr("style", original_style || "");
            return result;
        };

    if(!$.fn.visible_width)
        $.fn.visible_width = function (this: JQuery<HTMLElement>) {
            const original_style = this.attr("style");
            this.css({
                position:   'absolute!important',
                visibility: 'hidden!important',
                display:    'block!important'
            });

            const result = this.width();
            this.attr("style", original_style || "");
            return result;
        };

    if(!$.fn.firstParent)
        $.fn.firstParent = function (this: JQuery<HTMLElement>, selector: string) {
            if(this.is(selector))
                return this;
            return this.parent(selector);
        }
}

if(!Object.values) {
    Object.values = object => Object.keys(object).map(e => object[e]);
}

export = {};