const ipc = require("electron").ipcRenderer;
let callback_listener: (() => any)[] = [];

ipc.on('teaforo-update', (event, data: forum.UserData) => {
    console.log("Got data update: %o", data);
    forumIdentity = data ? new TeaForumIdentity(data.application_data, data.application_data_sign) : undefined;
    try {
        for(let listener of callback_listener)
            setImmediate(listener);
    } catch(e) {
        console.log(e);
    }

    callback_listener = [];
});

export function register_callback(callback: () => any) {
    callback_listener.push(callback);
}

export function open() {
    ipc.send("teaforo-login");
}