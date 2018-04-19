/// <reference path="chat.ts" />
/// <reference path="client.ts" />
/// <reference path="Identity.ts" />
/// <reference path="utils/modal.ts" />
/// <reference path="ui/modal/ModalConnect.ts" />
/// <reference path="ui/modal/ModalCreateChannel.ts" />
/// <reference path="codec/CodecWrapper.ts" />
/// <reference path="settings.ts" />
/// <reference path="log.ts" />

let settings: Settings;
let globalClient: TSClient;
let chat: ChatBox;

let forumIdentity: TeaForumIdentity;

function main() {
    //localhost:63343/Web-Client/index.php?disableUnloadDialog=1&default_connect_type=forum&default_connect_url=localhost
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
    //globalClient.startConnection("localhost:19974"); //TODO remove only for testing


    if(!settings.static(Settings.KEY_DISABLE_UNLOAD_DIALOG, false)) {
        window.addEventListener("beforeunload", function (event) {
            if(globalClient.serverConnection && globalClient.serverConnection.connected)
                event.returnValue = "Are you really sure?<br>You're still connected!";
            //event.preventDefault();
        });
    }
    //Modals.spawnConnectModal();
    //Modals.spawnSettingsModal();
    //Modals.createChannelModal(undefined);

    if(settings.static("default_connect_url")) {
        if(settings.static("default_connect_type", "forum")) {
            globalClient.startConnection(settings.static("default_connect_url"), forumIdentity);
        } else
            Modals.spawnConnectModal(settings.static("default_connect_url"));
    }
}

app.loadedListener.push(() => main());