let oldError = console.error;
console.error = function () {
    oldError("Got error:");
    oldError(arguments);
};

let wss = new WebSocket("wss:localhost:4433");
wss.onclose = ev => console.log(ev);
wss.onerror = ev => console.log(ev);
wss.onmessage = ev => console.log(ev);
wss.onopen = ev => console.log(ev);

setTimeout(() => {
    //document.location.assign("https://localhost:44330");
}, 1000);
setTimeout(() => {
    let win = window.open("https://localhost:44330");
    if(win) {
        win.close();
    }
}, 1000);