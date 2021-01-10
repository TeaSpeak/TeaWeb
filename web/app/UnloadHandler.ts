import {Settings, settings} from "tc-shared/settings";
import {server_connections} from "tc-shared/ConnectionManager";

window.addEventListener("beforeunload", event => {
    if(settings.getValue(Settings.KEY_DISABLE_UNLOAD_DIALOG)) {
        return;
    }

    const active_connections = server_connections.getAllConnectionHandlers().filter(e => e.connected);
    if(active_connections.length == 0) return;

    event.returnValue = "Are you really sure?<br>You're still connected!";
});