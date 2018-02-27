/// <reference path="chat.ts" />
/// <reference path="client.ts" />
/// <reference path="utils/modal.ts" />


import ccall = Module.ccall;

let globalClient = new TSClient();
let chat = new ChatBox($("#chat"));
globalClient.setup();
globalClient.startConnection("localhost:19978"); //TODO remove only for testing

let modal = 0;
$("#test").click(function () {
    console.log("Executing test function");
});
//$("#test").trigger("click");
$("#test_tab").tabify();

/*
createErrorModal("Could not connect to remote host",() => {
    let tag = $.spawn("div");
    tag.append("A fatal error occurred while connecting to host:port<br/>");
    tag.append("Please reload the page and try again!<br/>");
    return tag;
}, {
    footer: ""
}).open();
*/


let connectModal = createModal({
    header: function() {
        let header = $.spawn("div");
        header.text("Create a new connection");
        return header;
    },
    body: function () {
        let tag = $("#tmpl_connect").contents();


        let updateFields = function () {
            let button = tag.parents(".modal-content").find(".connect_connect_button");

            let field_address = tag.find(".connect_address");
            let address = field_address.val().toString();
            let flag_address = !!address.match(Regex.IP_V4) || !!address.match(Regex.DOMAIN);

            let field_nickname = tag.find(".connect_nickname");
            let nickname = field_nickname.val().toString();
            let flag_nickname = nickname.length >= 3 && nickname.length <= 32;

            if(flag_address) {
                if(field_address.hasClass("invalid_input"))
                    field_address.removeClass("invalid_input");
            } else {
                if(!field_address.hasClass("invalid_input"))
                    field_address.addClass("invalid_input");
            }

            if(flag_nickname) {
                if(field_nickname.hasClass("invalid_input"))
                    field_nickname.removeClass("invalid_input");
            } else {
                if(!field_nickname.hasClass("invalid_input"))
                    field_nickname.addClass("invalid_input");
            }

            if(!flag_nickname || !flag_address) {
                button.attr("disabled", "true");
            } else {
                button.removeAttr("disabled");
            }
        }
        tag.find(".connect_address").on("keyup", () => updateFields());
        tag.find(".connect_nickname").on("keyup", () => updateFields());
        //connect_address
        return $("#tmpl_connect").contents();
    },
    footer: function () {
        let tag = $.spawn("div");
        tag.css("text-align", "right");
        tag.css("margin-top", "3px");
        tag.css("margin-bottom", "6px");
        tag.addClass("modal-button-group");

        let button = $.spawn("button");
        button.addClass("connect_connect_button");
        button.text("Connect");
        button.on("click", function () {
            connectModal.close();

            let field_address = tag.parents(".modal-content").find(".connect_address");
            let address = field_address.val().toString();
            globalClient.startConnection(address);
        });
        tag.append(button);
        return tag;
    },

    width: 600,
    closeable: false
});
//connectModal.open();

var Regex = {
    //DOMAIN<:port>
    DOMAIN: /^(localhost|((([a-zA-Z0-9_-]{0,63}\.){0,253})?[a-zA-Z0-9_-]{0,63}\.[a-zA-Z]{2,5}))(|:(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[0-5]?[0-9]{1,4}))$/,
    //IP<:port>
    IP_V4: /(^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))(|:(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[0-5]?[0-9]{1,4}))$/,
    IP_V6: /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/,
    IP: /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
}

/*
let channelCreate = createModal({
    header: "Create channel",
    body: () => {
        let template = $("#tmpl_channel_edit").tmpl();
        template = $.spawn("div").append(template);
        let tag = template.tabify();

        return tag;
    },
    footer: () => {
        let footer = $.spawn("div");
        footer.addClass("modal-button-group");
        footer.css("margin-top", "5px");

        let buttonCancel = $.spawn("button");
        buttonCancel.text("Cancel");

        let buttonOk = $.spawn("button");
        buttonOk.text("Ok");

        footer.append(buttonCancel);
        footer.append(buttonOk);

        return footer;
    },
    width: 500
}).open();
*/

/*
let createOpusCodec = Module.cwrap("createOpusCodec", "pointer", []);
let codec = createOpusCodec();
console.log("Codec: " + codec);
let printCodecName = Module.cwrap("printCodecName", "void", ["pointer"]);
console.log("Result: " + printCodecName(codec));
*/
/*
let opus = new OpusCodec();
opus.initialise();
opus.decode(new Uint8Array([0, 0, 9]));
opus.encode(new Float32Array([123, 22, 434, 55332]));
*/