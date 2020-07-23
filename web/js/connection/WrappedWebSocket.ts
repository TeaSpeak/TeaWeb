import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";

const kPreventOpeningWebSocketClosing = false;

export class WrappedWebSocket {
    public readonly url: string;
    public socket: WebSocket;
    public state: "unconnected" | "connecting" | "connected" | "errored";

    /* callbacks for events after the socket has successfully connected! */
    public callbackMessage: (message) => void;
    public callbackDisconnect: (code: number, reason?: string) => void;
    public callbackErrored: () => void;

    private errorQueue = [];
    private connectResultListener = [];

    constructor(url: string) {
        this.url = url;
        this.state = "unconnected";
    }

    doConnect() {
        this.closeConnection();

        this.state = "connecting";
        try {
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                this.state = "connected";
                this.fireConnectResult();
            };

            this.socket.onclose = event => {
                if(this.state === "connecting") {
                    this.errorQueue.push(new Error(tr("Unexpected close with code ") + event.code + (event.reason ? " (" + event.reason + ")" : "")));
                    this.state = "errored";
                    this.fireConnectResult();
                } else if(this.state === "connected") {
                    if(this.callbackDisconnect)
                        this.callbackDisconnect(event.code, event.reason);

                    this.closeConnection();
                }
            };

            this.socket.onmessage = event => {
                if(this.callbackMessage)
                    this.callbackMessage(event.data);
            };

            this.socket.onerror = () => {
                if(this.state === "connected") {
                    this.state = "errored";

                    if(this.callbackErrored)
                        this.callbackErrored();

                } else if(this.state === "connecting") {
                    this.state = "errored";
                    this.fireConnectResult();
                }
            }
        } catch (error) {
            this.state = "errored";
            this.errorQueue.push(error);
            this.fireConnectResult();
        }
    }

    async awaitConnectResult() {
        while (this.state === "connecting")
            await new Promise<void>(resolve => this.connectResultListener.push(resolve));
    }

    closeConnection() {
        this.state = "unconnected";

        if(this.socket) {
            this.socket.onopen = undefined;
            this.socket.onclose = undefined;
            this.socket.onerror = undefined;
            this.socket.onmessage = undefined;

            try {
                if(this.socket.readyState === WebSocket.OPEN) {
                    this.socket.close();
                } else if(this.socket.readyState === WebSocket.CONNECTING) {
                    if(kPreventOpeningWebSocketClosing) {
                        /* to prevent the "WebSocket is closed before the connection is established." warning in the console */
                        const socket = this.socket;

                        const cleanup = () => {
                            if(socket.readyState === WebSocket.OPEN)
                                socket.close();

                            socket.onopen = undefined;
                            socket.onclose = undefined;
                            socket.onerror = undefined;
                            socket.onmessage = undefined;
                        };

                        socket.onopen = cleanup;
                        socket.onclose = cleanup;
                        socket.onerror = cleanup;
                        socket.onmessage = cleanup;
                    } else {
                        this.socket.close();
                    }
                }
            } catch (error) {
                log.warn(LogCategory.NETWORKING, tr("Failed to close the web socket to %s: %o"), this.url, error);
            }

            this.socket = undefined;
        }

        this.errorQueue = [];
        this.fireConnectResult();
    }

    private fireConnectResult() {
        while(this.connectResultListener.length > 0)
            this.connectResultListener.pop()();
    }

    hasError() {
        return this.errorQueue.length !== 0;
    }

    popError() {
        return this.errorQueue.pop_front();
    }
}