/// <reference path="chat.ts" />
/// <reference path="client.ts" />
/// <reference path="Identity.ts" />
/// <reference path="utils/modal.ts" />
/// <reference path="ui/modal/ModalConnect.ts" />
/// <reference path="ui/modal/ModalCreateChannel.ts" />
/// <reference path="ui/modal/ModalBanClient.ts" />
/// <reference path="ui/modal/ModalYesNo.ts" />
/// <reference path="codec/CodecWrapper.ts" />
/// <reference path="settings.ts" />
/// <reference path="log.ts" />

let settings: Settings;
let globalClient: TSClient;
let chat: ChatBox;

let forumIdentity: TeaForumIdentity;

const js_render = window.jsrender || $;
const native_client = window.require !== undefined;

function setup_close() {
    if(settings.static(Settings.KEY_DISABLE_UNLOAD_DIALOG, false)) return;

    window.onbeforeunload = event => {
        if(!globalClient.serverConnection || !globalClient.serverConnection.connected) return;

        if(!native_client) {
            event.returnValue = "Are you really sure?<br>You're still connected!";
        } else {
            event.preventDefault();
            event.returnValue = "question";

            const {remote} = require('electron');
            const dialog = remote.dialog;

            dialog.showMessageBox(remote.getCurrentWindow(), {
                    type: 'question',
                    buttons: ['Yes', 'No'],
                    title: 'Confirm',
                    message: 'Are you really sure?\nYou\'re still connected!'
            }, choice => {
                if(choice === 0) {
                    window.onbeforeunload = undefined;
                    remote.getCurrentWindow().close();
                }
            });
        }
    };
}

function main() {
    if(!js_render) {
        displayCriticalError("Missing jsrender extension!");
        return;
    }
    if(!js_render.views) {
        displayCriticalError("Missing jsrender viewer extension!");
        return;
    }
    js_render.views.settings.allowCode(true);
    js_render.views.tags("rnd", (argument) => {
        let min = parseInt(argument.substr(0, argument.indexOf('~')));
        let max = parseInt(argument.substr(argument.indexOf('~') + 1));

        return (Math.round(Math.random() * (min + max + 1) - min)).toString();
    });
    //http://localhost:63343/Web-Client/index.php?_ijt=omcpmt8b9hnjlfguh8ajgrgolr&default_connect_url=true&default_connect_type=teamspeak&default_connect_url=localhost%3A9987&disableUnloadDialog=1&loader_ignore_age=1
    AudioController.initializeAudioController();
    if(!TSIdentityHelper.setup()) { console.error("Could not setup the TeamSpeak identity parser!"); return; }

    settings = new Settings();
    globalClient = new TSClient();
    /** Setup the XF forum identity **/
    if(settings.static("forum_user_data")) {
        forumIdentity = new TeaForumIdentity(settings.static("forum_user_data"), settings.static("forum_user_sign"));
    }

    chat = new ChatBox($("#chat"));
    globalClient.setup();


    if(!settings.static(Settings.KEY_DISABLE_UNLOAD_DIALOG, false) && !native_client) {

    }
    //Modals.spawnConnectModal();
    //Modals.spawnSettingsModal();
    //Modals.createChannelModal(undefined);

    if(settings.static("default_connect_url")) {
        switch (settings.static("default_connect_type")) {
            case "teaforo":
                if(forumIdentity.valid())
                    globalClient.startConnection(settings.static("default_connect_url"), forumIdentity);
                else
                    Modals.spawnConnectModal(settings.static("default_connect_url"), IdentitifyType.TEAFORO);
                break;

            case "teamspeak":
                let connectIdentity = TSIdentityHelper.loadIdentity(settings.global("connect_identity_teamspeak_identity", ""));
                if(!connectIdentity || !connectIdentity.valid())
                    Modals.spawnConnectModal(settings.static("default_connect_url"), IdentitifyType.TEAMSPEAK);
                else
                    globalClient.startConnection(settings.static("default_connect_url"), connectIdentity);
                break;

            default:
                Modals.spawnConnectModal(settings.static("default_connect_url"));
        }
    }

    /*
    let tag = $("#tmpl_music_frame").renderTag({
        //thumbnail: "img/loading_image.svg"
    });



    $("#music-test").replaceWith(tag);

    //Modals.spawnSettingsModal();
    /*
    Modals.spawnYesNo("Are your sure?", "Do you really want to exit?", flag => {
        console.log("Response: " + flag);
    })
    */

    //Modals.spawnPermissionEdit();

    setup_close();
    $(window).on('resize', () => {
        globalClient.channelTree.handle_resized();
    });
}

app.loadedListener.push(() => {
    try {
        main();
        if(!AudioController.initialized()) {
            log.info(LogCategory.VOICE, "Initialize audio controller later!");
            $(document).one('click', event => AudioController.initializeFromGesture());
        }
    } catch (ex) {
        if(ex instanceof ReferenceError)
            ex = ex.message + ":<br>" + ex.stack;
        displayCriticalError("Failed to invoke main function:<br>" + ex);
    }
});
