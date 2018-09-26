interface Array<T> {
    remove(elem?: T): boolean;
    last?(): T;

    pop_front(): T | undefined;
}

interface JSON {
    map_to<T>(object: T, json: any, variables?: string | string[], validator?: (map_field: string, map_value: string) => boolean, variable_direction?: number) : T;
    map_field_to<T>(object: T, value: any, field: string) : T;
}

interface JQuery {
    render(values?: any) : string;
    renderTag(values?: any) : JQuery;
}

interface JQueryStatic<TElement extends Node = HTMLElement> {
    spawn<K extends keyof HTMLElementTagNameMap>(tagName: K): JQuery<HTMLElementTagNameMap[K]>;
    views: any;
}

interface String {
    format(...fmt): string;
    format(arguments: string[]): string;
}

if(!JSON.map_to) {
    JSON.map_to = function<T>(object: T, json: any, variables?: string | string[], validator?: (map_field: string, map_value: string) => boolean, variable_direction?: number) : T {
        if(!validator) validator = (a, b) => true;

        if(!variables) {
            variables = [];

            if(!variable_direction || variable_direction == 0) {
                for(let field in json)
                    variables.push(field);
            } else if(variable_direction == 1) {
                for(let field in object)
                    variables.push(field);
            }
        } else if(!Array.isArray(variables)) {
            variables = [variables];
        }

        for(let field of variables) {
            if(!json[field]) {
                console.trace("Json does not contains %s", field);
                continue;
            }
            if(!validator(field, json[field])) {
                console.trace("Validator results in false for %s", field);
                continue;
            }

            JSON.map_field_to(object, json[field], field);
        }
        return object;
    }
}

if(!JSON.map_field_to) {
    JSON.map_field_to = function<T>(object: T, value: any, field: string) : T {
        let field_type = typeof(object[field]);
        if(field_type == "string" || field_type == "object" || field_type == "undefined")
            object[field as string] = value;
        else if(field_type == "number")
            object[field as string] = parseFloat(value);
        else if(field_type == "boolean")
            object[field as string] = value == "1" || value == "true";
        else console.warn("Invalid object type %s for entry %s", field_type, field);

        return object;
    }
}

if (!Array.prototype.remove) {
    Array.prototype.remove = function<T>(elem?: T): boolean {
        const index = this.indexOf(elem, 0);
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


if (!Array.prototype.last){
    Array.prototype.last = function(){
        if(this.length == 0) return undefined;
        return this[this.length - 1];
    };
}

if(typeof ($) !== "undefined") {
    if(!$.spawn) {
        $.spawn = function<K extends keyof HTMLElementTagNameMap>(tagName: K): JQuery<HTMLElementTagNameMap[K]> {
            return $(document.createElement(tagName));
        }
    }
    if(!$.prototype.renderTag) {
        $.prototype.renderTag = function (values?: any) : JQuery {
            return $(this.render(values));
        }
    }
}

if (!String.prototype.format) {
    String.prototype.format = function() {
        const args = arguments;
        let array = args.length == 1 && $.isArray(args[0]);
        return this.replace(/\{\{|\}\}|\{(\d+)\}/g, function (m, n) {
            if (m == "{{") { return "{"; }
            if (m == "}}") { return "}"; }
            return array ? args[0][n] : args[n];
        });
    };
}

function concatenate(resultConstructor, ...arrays) {
    let totalLength = 0;
    for (const arr of arrays) {
        totalLength += arr.length;
    }
    const result = new resultConstructor(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

function formatDate(secs: number) : string {
    let years   = Math.floor(secs  / (60 * 60 * 24 * 365));
    let days    = Math.floor(secs  / (60 * 60 * 24)) % 365;
    let hours   = Math.floor(secs / (60 * 60)) % 24;
    let minutes = Math.floor(secs / 60) % 60;
    let seconds = Math.floor(secs % 60);

    let result = "";
    if(years > 0)
        result += years + " years ";
    if(years > 0 || days > 0)
        result += days + " days ";
    if(years > 0 || days > 0 || hours > 0)
        result += hours + " hours ";
    if(years > 0 || days > 0 || hours > 0 || minutes > 0)
        result += minutes + " minutes ";
    if(years > 0 || days > 0 || hours > 0 || minutes > 0 || seconds > 0)
        result += seconds + " seconds ";
    else
        result = "now ";

    return result.substr(0, result.length - 1);
}

function calculate_width(text: string) : number {
    let element = $.spawn("div");
    element.text(text)
        .css("display", "none")
        .css("margin", 0);
    $("body").append(element);
    let size = element.width();
    element.detach();
    return size;
}

declare class webkitAudioContext extends AudioContext {}
declare class webkitOfflineAudioContext extends OfflineAudioContext {}
interface Window {
    readonly webkitAudioContext: typeof webkitAudioContext;
    readonly AudioContext: typeof webkitAudioContext;
    readonly OfflineAudioContext: typeof OfflineAudioContext;
    readonly webkitOfflineAudioContext: typeof webkitOfflineAudioContext;
    readonly RTCPeerConnection: typeof RTCPeerConnection;
}