import MouseDownEvent = JQuery.MouseDownEvent;

enum ElementType {
    HEADER,
    BODY,
    FOOTER
}

type BodyCreator = (() => JQuery | JQuery[] | string) | string | JQuery | JQuery[];
const ModalFunctions = {
    divify: function (val: JQuery) {
        if(val.length > 1) return $.spawn("div").append(val);
        return val;
    },

    jqueriefy: function(val: BodyCreator, type?: ElementType) : JQuery {
        if($.isFunction(val)) val = val();
        if($.isArray(val)) {
            let result = $.spawn("div");
            for(let element of val)
                this.jqueriefy(element, type).appendTo(result);
            return result;
        }
        switch (typeof val){
            case "string":
                if(type == ElementType.HEADER)
                    return $.spawn("div").addClass("modal-title").text(val);
                return $("<div>" + val + "</div>");
            case "object": return val as JQuery;
            case "undefined":
                return undefined;
            default:
                console.error(("Invalid type %o"), typeof val);
                return $();
        }
    },

    warpProperties(data: ModalProperties | any) : ModalProperties {
        if(data instanceof ModalProperties) return data;
        else {
            const props = new ModalProperties();
            for(const key of Object.keys(data))
                props[key] = data[key];
            return props;
        }
    }
};

class ModalProperties {
    template?: string;
    header: BodyCreator = () => "HEADER";
    body: BodyCreator = ()    => "BODY";
    footer: BodyCreator = ()  => "FOOTER";

    closeListener: (() => void) | (() => void)[] = () => {};
    registerCloseListener(listener: () => void) : this {
        if(this.closeListener) {
            if($.isArray(this.closeListener))
                this.closeListener.push(listener);
            else
                this.closeListener = [this.closeListener, listener];
        } else this.closeListener = listener;
        return this;
    }
    width: number | string;
    min_width?: number | string;
    height: number | string = "auto";

    closeable: boolean = true;

    triggerClose(){
        if($.isArray(this.closeListener))
            for(let listener of this.closeListener)
                listener();
        else
            this.closeListener();
    }

    template_properties?: any = {};
    trigger_tab: boolean = true;
    full_size?: boolean = false;
}

$(document).on('mousedown', (event: MouseDownEvent) => {
    /* pageX or pageY are undefined if this is an event executed via .trigger('click'); */
    if(_global_modal_count == 0 || typeof(event.pageX) === "undefined" || typeof(event.pageY) === "undefined")
        return;


    let element = event.target as HTMLElement;
    do {
        if(element.classList.contains('modal-content'))
            break;

        if(!element.classList.contains('modal'))
            continue;

        if(element == _global_modal_last && _global_modal_last_time + 100 > Date.now())
            break;

        $(element).find("> .modal-dialog > .modal-content > .modal-header .button-modal-close").trigger('click');
        break;
    } while((element = element.parentElement));
});

let _global_modal_count = 0;
let _global_modal_last: HTMLElement;
let _global_modal_last_time: number;

class Modal {
    private _htmlTag: JQuery;
    properties: ModalProperties;
    shown: boolean;

    open_listener: (() => any)[] = [];
    close_listener: (() => any)[] = [];
    close_elements: JQuery;

    constructor(props: ModalProperties) {
        this.properties = props;
        this.shown = false;
    }

    get htmlTag() : JQuery {
        if(!this._htmlTag) this._create();
        return this._htmlTag;
    }

    private _create() {
        const header = ModalFunctions.jqueriefy(this.properties.header, ElementType.HEADER);
        const body = ModalFunctions.jqueriefy(this.properties.body, ElementType.BODY);
        const footer = ModalFunctions.jqueriefy(this.properties.footer, ElementType.FOOTER);

        //FIXME: cache template
        const template = $(this.properties.template || "#tmpl_modal");

        const properties = {
            modal_header: header,
            modal_body: body,
            modal_footer: footer,

            closeable: this.properties.closeable,
            full_size: this.properties.full_size
        };

        if(this.properties.template_properties)
            Object.assign(properties, this.properties.template_properties);

        const tag = template.renderTag(properties);
        if(typeof(this.properties.width) !== "undefined" && typeof(this.properties.min_width) !== "undefined")
            tag.find(".modal-content")
                .css("min-width", this.properties.min_width)
                .css("width", this.properties.width);
        else if(typeof(this.properties.width) !== "undefined") //Legacy support
            tag.find(".modal-content").css("min-width", this.properties.width);
        else if(typeof(this.properties.min_width) !== "undefined")
            tag.find(".modal-content").css("min-width", this.properties.min_width);

        this.close_elements = tag.find(".button-modal-close");
        this.close_elements.toggle(this.properties.closeable).on('click', event => {
            if(this.properties.closeable)
                this.close();
        });
        this._htmlTag = tag;

        this._htmlTag.find("input").on('change', event => {
            $(event.target).parents(".form-group").toggleClass('is-filled', !!(event.target as HTMLInputElement).value);
        });

        //TODO: After the animation!
        this._htmlTag.on('hide.bs.modal', event => !this.properties.closeable || this.close());
        this._htmlTag.on('hidden.bs.modal', event => this._htmlTag.remove());
    }

    open() {
        if(this.shown)
            return;

        _global_modal_last_time = Date.now();
        _global_modal_last = this.htmlTag[0];

        this.shown = true;
        this.htmlTag.appendTo($("body"));

        _global_modal_count++;
        this.htmlTag.show();
        setTimeout(() => this.htmlTag.addClass('shown'), 0);

        setTimeout(() => {
            for(const listener of this.open_listener) listener();
            this.htmlTag.find(".tab").trigger('tab.resize');
        }, 300);
    }

    close() {
        if(!this.shown) return;

        _global_modal_count--;
        this.shown = false;
        this.htmlTag.removeClass('shown');
        setTimeout(() => {
            this.htmlTag.remove();
            this._htmlTag = undefined;
        }, 300);
        this.properties.triggerClose();
        for(const listener of this.close_listener)
            listener();
    }

    set_closeable(flag: boolean) {
        if(flag === this.properties.closeable)
            return;

        this.properties.closeable = flag;
        this.close_elements.toggle(flag);
    }
}

function createModal(data: ModalProperties | any) : Modal {
    return new Modal(ModalFunctions.warpProperties(data));
}

class InputModalProperties extends ModalProperties {
    maxLength?: number;

    field_title?: string;
    field_label?: string;
    field_placeholder?: string;

    error_message?: string;
}

function createInputModal(headMessage: BodyCreator, question: BodyCreator, validator: (input: string) => boolean, callback: (flag: boolean | string) => void, props: InputModalProperties | any = {}) : Modal {
    props = ModalFunctions.warpProperties(props);
    props.template_properties || (props.template_properties = {});
    props.template_properties.field_title = props.field_title;
    props.template_properties.field_label = props.field_label;
    props.template_properties.field_placeholder = props.field_placeholder;
    props.template_properties.error_message = props.error_message;

    props.template = "#tmpl_modal_input";

    props.header = headMessage;
    props.template_properties.question = ModalFunctions.jqueriefy(question);

    const modal = createModal(props);

    const input = modal.htmlTag.find(".container-value input");
    const button_cancel = modal.htmlTag.find(".button-cancel");
    const button_submit = modal.htmlTag.find(".button-submit");

    let submited = false;
    input.on('keyup change', event => {
        const str = input.val() as string;
        const valid = str !== undefined && validator(str);

        input.attr("pattern", valid ? null : "^[a]{1000}$").toggleClass("is-invalid", !valid);
        button_submit.prop("disabled", !valid);
    });
    input.on('keydown', event => {
        if(event.keyCode !== KeyCode.KEY_RETURN || event.shiftKey)
            return;
        if(button_submit.prop("disabled"))
            return;
        button_submit.trigger('click');
    });

    button_submit.on('click', event => {
        if(!submited) {
            submited = true;
            const str = input.val() as string;
            if(str !== undefined && validator(str))
                callback(str);
            else
                callback(false);
        }
        modal.close();
    }).prop("disabled", !validator("")); /* disabled if empty input isn't allowed */

    button_cancel.on('click', event => {
        if(!submited) {
            submited = true;
            callback(false);
        }
        modal.close();
    });

    modal.open_listener.push(() => input.focus());
    modal.close_listener.push(() => button_cancel.trigger('click'));
    return modal;
}

function createErrorModal(header: BodyCreator, message: BodyCreator, props: ModalProperties | any = { footer: undefined }) {
    props = ModalFunctions.warpProperties(props);
    (props.template_properties || (props.template_properties = {})).header_class = "modal-header-error";

    props.header = header;
    props.body = message;

    const modal = createModal(props);
    modal.htmlTag.find(".modal-body").addClass("modal-error");
    return modal;
}

function createInfoModal(header: BodyCreator, message: BodyCreator, props: ModalProperties | any = { footer: undefined }) {
    props = ModalFunctions.warpProperties(props);
    (props.template_properties || (props.template_properties = {})).header_class = "modal-header-info";

    props.header = header;
    props.body = message;

    const modal = createModal(props);
    modal.htmlTag.find(".modal-body").addClass("modal-info");
    return modal;
}

/* extend jquery */

interface ModalElements {
    header?: BodyCreator;
    body?: BodyCreator;
    footer?: BodyCreator;
}

interface JQuery<TElement = HTMLElement> {
    modalize(entry_callback?: (header: JQuery, body: JQuery, footer: JQuery) => ModalElements | void, properties?: ModalProperties | any) : Modal;
}

$.fn.modalize = function (this: JQuery, entry_callback?: (header: JQuery, body: JQuery, footer: JQuery) => ModalElements | void, properties?: ModalProperties | any) : Modal {
    properties = properties || {} as ModalProperties;
    entry_callback = entry_callback || ((a,b,c) => undefined);

    let tag_modal = this[0].tagName.toLowerCase() == "modal" ? this : undefined; /* TODO may throw exception? */

    let tag_head = tag_modal ? tag_modal.find("modal-header") : ModalFunctions.jqueriefy(properties.header);
    let tag_body = tag_modal ? tag_modal.find("modal-body") : this;
    let tag_footer = tag_modal ? tag_modal.find("modal-footer") : ModalFunctions.jqueriefy(properties.footer);

    const result = entry_callback(tag_head, tag_body, tag_footer) || {};
    properties.header = result.header || tag_head;
    properties.body = result.body || tag_body;
    properties.footer = result.footer || tag_footer;
    return createModal(properties);
};









































