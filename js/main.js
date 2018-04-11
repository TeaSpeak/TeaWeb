/// <reference path="chat.ts" />
/// <reference path="client.ts" />
/// <reference path="Identity.ts" />
/// <reference path="utils/modal.ts" />
/// <reference path="ui/modal/ModalConnect.ts" />
/// <reference path="codec/CodecWrapper.ts" />
/// <reference path="settings.ts" />
let globalClient;
let chat;
let forumIdentity;
function invokeMain() {
    AudioController.initializeAudioController();
    if (!TSIdentityHelper.setup()) {
        console.error("Could not setup the TeamSpeak identity parser!");
        return;
    }
    globalClient = new TSClient();
    /** Setup the XF forum identity **/
    if (globalClient.settings.static("forum_user_data")) {
        forumIdentity = new TeaForumIdentity(globalClient.settings.static("forum_user_data"), globalClient.settings.static("forum_user_sign"));
    }
    chat = new ChatBox($("#chat"));
    globalClient.setup();
    //globalClient.startConnection("localhost:19974"); //TODO remove only for testing
    //Modals.spawnConnectModal();
    //Modals.spawnSettingsModal();
    window.addEventListener("beforeunload", function (event) {
        if (globalClient.serverConnection && globalClient.serverConnection.connected)
            event.returnValue = "Are you really sure?<br>You're still connected!";
        //event.preventDefault();
    });
    //console.log("XF: " + globalClient.settings.static("forum_user_data"));
    //console.log("XF: " + globalClient.settings.static("forum_user_sign"));
}
//# sourceMappingURL=main.js.map