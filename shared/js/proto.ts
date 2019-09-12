//Used by CertAccept popup

interface Array<T> {
    remove(elem?: T): boolean;
    last?(): T;

    pop_front(): T | undefined;
}

interface JSON {
    map_to<T>(object: T, json: any, variables?: string | string[], validator?: (map_field: string, map_value: string) => boolean, variable_direction?: number) : number;
    map_field_to<T>(object: T, value: any, field: string) : boolean;
}

type JQueryScrollType = "height" | "width";
interface JQuery<TElement = HTMLElement> {
    render(values?: any) : string;
    renderTag(values?: any) : JQuery<TElement>;
    hasScrollBar(direction?: JQueryScrollType) : boolean;


    visible_height() : number;
    visible_width() : number;

    /* bootstrap */
    alert() : JQuery<TElement>;
    modal(properties: any) : this;
    bootstrapMaterialDesign() : this;

    /* first element which matches the selector, could be the element itself or a parent */
    firstParent(selector: string) : JQuery;
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
    JSON.map_to = function <T>(object: T, json: any, variables?: string | string[], validator?: (map_field: string, map_value: string) => boolean, variable_direction?: number): number {
        if (!validator) validator = (a, b) => true;

        if (!variables) {
            variables = [];

            if (!variable_direction || variable_direction == 0) {
                for (let field in json)
                    variables.push(field);
            } else if (variable_direction == 1) {
                for (let field in object)
                    variables.push(field);
            }
        } else if (!Array.isArray(variables)) {
            variables = [variables];
        }

        let updates = 0;
        for (let field of variables) {
            if (!json[field]) {
                console.trace(tr("Json does not contains %s"), field);
                continue;
            }
            if (!validator(field, json[field])) {
                console.trace(tr("Validator results in false for %s"), field);
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
        let field_type = typeof(object[field]);
        let new_object;
        if(field_type == "string" || field_type == "object" || field_type == "undefined")
            new_object = value;
        else if(field_type == "number")
            new_object = parseFloat(value);
        else if(field_type == "boolean")
            new_object = value == "1" || value == "true";
        else {
            console.warn(tr("Invalid object type %s for entry %s"), field_type, field);
            return false;
        }

        if(new_object === object[field as string]) return false;

        object[field as string] = new_object;
        return true;
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
            return $(document.createElement(tagName) as any);
        }
    }
    if(!$.fn.renderTag) {
        $.fn.renderTag = function (this: JQuery, values?: any) : JQuery {
            let result;
            if(this.render) {
                result = $(this.render(values));
            } else {
                const template = window.jsrender.render[this.attr("id")];
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
        }
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
        }
    if(!$.fn.firstParent)
        $.fn.firstParent = function (this: JQuery<HTMLElement>, selector: string) {
            if(this.is(selector))
                return this;
            return this.parent(selector);
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
        result += years + " " + tr("years") + " ";
    if(years > 0 || days > 0)
        result += days + " " + tr("days") + " ";
    if(years > 0 || days > 0 || hours > 0)
        result += hours + " " + tr("hours") + " ";
    if(years > 0 || days > 0 || hours > 0 || minutes > 0)
        result += minutes + " " + tr("minutes") + " ";
    if(years > 0 || days > 0 || hours > 0 || minutes > 0 || seconds > 0)
        result += seconds + " " + tr("seconds") + " ";
    else
        result = tr("now") + " ";

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

interface Twemoji {
    parse(message: string) : string;
}
declare let twemoji: Twemoji;

interface HighlightJS {
    listLanguages() : string[];
    getLanguage(name: string) : any | undefined;

    highlight(language: string, text: string, ignore_illegals?: boolean) : HighlightJSResult;
    highlightAuto(text: string) : HighlightJSResult;
}

interface HighlightJSResult {
    language: string;
    relevance: number;

    value: string;
    second_best?: any;
}

interface DOMPurify {
    sanitize(html: string, config?: {
        ADD_ATTR?: string[]
    }) : string;
}
declare let DOMPurify: DOMPurify;

declare let remarkable: typeof window.remarkable;

declare class webkitAudioContext extends AudioContext {}
declare class webkitOfflineAudioContext extends OfflineAudioContext {}

interface Window {
    readonly webkitAudioContext: typeof webkitAudioContext;
    readonly AudioContext: typeof webkitAudioContext;
    readonly OfflineAudioContext: typeof OfflineAudioContext;
    readonly webkitOfflineAudioContext: typeof webkitOfflineAudioContext;
    readonly RTCPeerConnection: typeof RTCPeerConnection;
    readonly Pointer_stringify: any;
    readonly jsrender: any;

    twemoji: Twemoji;
    hljs: HighlightJS;
    remarkable: any;

    require(id: string): any;
}

interface Navigator {
    browserSpecs: {
        name: string,
        version: string
    };

    mozGetUserMedia(constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback): void;
    webkitGetUserMedia(constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback): void;
}