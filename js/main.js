/// <reference path="chat.ts" />
/// <reference path="client.ts" />
/// <reference path="utils/modal.ts" />
/// <reference path="ui/modal/ModalConnect.ts" />
let globalClient = new TSClient();
let chat = new ChatBox($("#chat"));
globalClient.setup();
//globalClient.startConnection("localhost:19974"); //TODO remove only for testing
//Modals.spawnConnectModal();
//Modals.spawnSettingsModal();
window.addEventListener("beforeunload", function (event) {
    if (globalClient.serverConnection && globalClient.serverConnection.connected)
        event.returnValue = "Are you really sure?<br>You're still connected!";
    //event.preventDefault();
});
//# sourceMappingURL=main.js.map