$(document).on("mousedown",function (e) {
    if($(e.target).parents(".modal").length == 0){
        $(".modal:visible").last().find(".close").trigger("click");
    }
});

type BodyCreator = (() => JQuery | JQuery[] | string) | string | JQuery | JQuery[];
const ModalFunctions = {
    divify: function (val: JQuery) {
        if(val.length > 1) return $.spawn("div").append(val);
        return val;
    },

    jqueriefy: function(val: BodyCreator) : JQuery {
        if($.isFunction(val)) val = val();
        if($.isArray(val)) {
            let result = $.spawn("div");
            for(let element of val)
                this.jqueriefy(element).appendTo(result);
            return result;
        }
        switch (typeof val){
            case "string": return $("<div>" + val + "</div>");
            case "object": return val as JQuery;
            case "undefined":
                console.warn("Got undefined type!");
                return $.spawn("div");
            default:
                console.error("Invalid type " + typeof val);
                return $();
        }
    },

    warpProperties(data: ModalProperties | any) : ModalProperties {
        if(data instanceof ModalProperties) return data;
        else {
            let props = new ModalProperties();
            for(let key in data)
                props[key] = data[key];
            return props;
        }
    }
};

class ModalProperties {
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
    width: number | string = "60%";
    hight: number | string = "auto";

    closeable: boolean = true;

    triggerClose(){
        if($.isArray(this.closeListener))
            for(let listener of this.closeListener)
                listener();
        else
            this.closeListener();
    }
}

class Modal {
    private _htmlTag: JQuery;
    properties: ModalProperties;

    constructor(props: ModalProperties) {
        this.properties = props;
    }

    get htmlTag() : JQuery {
        if(!this._htmlTag) this._create();
        return this._htmlTag;
    }

    private _create() {
        let modal = $.spawn("div");
        modal.addClass("modal");

        let content = $.spawn("div");
        content.addClass("modal-content");
        content.css("width", this.properties.width);

        let header = ModalFunctions.divify(ModalFunctions.jqueriefy(this.properties.header)).addClass("modal-header");
        if(this.properties.closeable) header.append("<span class=\"close\">&times;</span>");

        let body = ModalFunctions.divify(ModalFunctions.jqueriefy(this.properties.body)).addClass("modal-body");
        let footer = ModalFunctions.divify(ModalFunctions.jqueriefy(this.properties.footer)).addClass("modal-footer");

        content.append(header);
        content.append(body);
        content.append(footer);

        modal.append(content);

        modal.find(".close").click(function () {
            if(this.properties.closeable)
                this.close();
        }.bind(this));

        this._htmlTag = modal;
    }

    open() {
        this.htmlTag.appendTo($("body"));
        this.htmlTag.show();
    }

    close() {
        const _this = this;
        this.htmlTag.animate({opacity: 0}, () => {
            _this.htmlTag.detach();
        });
        this.properties.triggerClose();
    }
}

function createModal(data: ModalProperties | any) : Modal {
    return new Modal(ModalFunctions.warpProperties(data));
}

class InputModalProperties extends ModalProperties {
    maxLength: number;
}

function createInputModal(headMessage: BodyCreator, question: BodyCreator, validator: (input: string) => boolean, callback: (flag: boolean | string) => void, props: InputModalProperties | any = {}) : Modal {
    props = ModalFunctions.warpProperties(props);

    let head = $.spawn("div");
    head.css("border-bottom", "grey solid");
    head.css("border-width", "1px");
    ModalFunctions.jqueriefy(headMessage).appendTo(head);


    let body = $.spawn("div");
    ModalFunctions.divify(ModalFunctions.jqueriefy(question)).appendTo(body);
    let input = $.spawn("input");
    input.css("width", "100%");
    input.appendTo(body);
    console.log(input);

    let footer = $.spawn("div");
    footer.addClass("modal-button-group");
    footer.css("margin-top", "5px");

    let buttonCancel = $.spawn("button");
    buttonCancel.text("Cancel");

    let buttonOk = $.spawn("button");
    buttonOk.text("Ok");

    footer.append(buttonCancel);
    footer.append(buttonOk);

    input.on("keydown", function (event) {
        if(event.keyCode == JQuery.Key.Enter) {
            buttonOk.trigger("click");
        }
    });

    let updateValidation = function () {
        let text = input.val().toString();
        let flag = (!props.maxLength || text.length <= props.maxLength) && validator(text);
        if(flag) {
            input.removeClass("invalid_input");
            buttonOk.removeAttr("disabled");
        } else {
            if(!input.hasClass("invalid_input"))
                input.addClass("invalid_input");
            buttonOk.attr("disabled", "true");
        }
    };
    input.on("keyup", updateValidation);

    let callbackCalled = false;
    let wrappedCallback = function (flag: boolean | string) {
        if(callbackCalled) return;
        callbackCalled = true;
        callback(flag);
    };

    let modal;
    buttonOk.on("click", () => {
        wrappedCallback(input.val().toString());
        modal.close();
    });
    buttonCancel.on("click", () => {
        wrappedCallback(false);
        modal.close();
    });

    props.header = head;
    props.body = body;
    props.footer = footer;
    props.closeListener = () => wrappedCallback(false);
    modal = createModal(props);
    return modal;
}

function createErrorModal(header: BodyCreator, message: BodyCreator, props: ModalProperties | any = { footer: "" }) {
    props = ModalFunctions.warpProperties(props);

    let head = $.spawn("div");
    head.addClass("modal-head-error");
    ModalFunctions.divify(ModalFunctions.jqueriefy(header)).appendTo(head);
    props.header = head;

    props.body = ModalFunctions.divify(ModalFunctions.jqueriefy(message));
    props.footer = ModalFunctions.divify(ModalFunctions.jqueriefy(""));

    return createModal(props);
}

function createInfoModal(header: BodyCreator, message: BodyCreator, props: ModalProperties | any = { footer: "" }) {
    props = ModalFunctions.warpProperties(props);

    let head = $.spawn("div");
    head.addClass("modal-head-info");
    ModalFunctions.divify(ModalFunctions.jqueriefy(header)).appendTo(head);
    props.header = head;

    props.body = ModalFunctions.divify(ModalFunctions.jqueriefy(message));
    props.footer = ModalFunctions.divify(ModalFunctions.jqueriefy(""));

    return createModal(props);
}