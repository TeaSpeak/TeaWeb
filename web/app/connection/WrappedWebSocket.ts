import * as log from "tc-shared/log";
import {LogCategory, logWarn} from "tc-shared/log";
import {ConnectionStatistics} from "tc-shared/connection/ConnectionBase";
import { tr } from "tc-shared/i18n/localize";

const kPreventOpeningWebSocketClosing = false;

export type WebSocketUrl = {
    secure: boolean;

    host: string,
    port: number,

    path?: string
};
export class WrappedWebSocket {
    public readonly address: WebSocketUrl;
    public state: "unconnected" | "connecting" | "connected" | "errored";

    private socket: WebSocket;

    /* callbacks for events after the socket has successfully connected! */
    public callbackMessage: (message) => void;
    public callbackDisconnect: (code: number, reason?: string) => void;
    public callbackErrored: () => void;

    private errorQueue = [];
    private connectResultListener = [];

    private bytesReceived;
    private bytesSend;

    constructor(addr: WebSocketUrl) {
        this.address = addr;
        this.state = "unconnected";
    }

    getControlStatistics() : ConnectionStatistics {
        return {
            bytesReceived: this.bytesReceived,
            bytesSend: this.bytesSend
        };
    }

    socketUrl() : string {
        let result = "";
        result += this.address.secure ? "wss://" : "ws://";
        result += this.address.host + ":" + this.address.port;
        if(this.address.path)
            result += (this.address.path.startsWith("/") ? "" : "/") + this.address.path;
        return result
    }

    doConnect() {
        this.closeConnection();

        this.state = "connecting";
        try {
            this.socket = new WebSocket(this.socketUrl());

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
                if(typeof event.data === "string") {
                    this.bytesReceived += event.data.length;
                } else if(event.data instanceof ArrayBuffer) {
                    this.bytesReceived += event.data.byteLength;
                }

                if(this.callbackMessage) {
                    this.callbackMessage(event.data);
                }
            };

            this.socket.onerror = () => {
                if(this.state === "connected") {
                    this.state = "errored";

                    if(this.callbackErrored) {
                        this.callbackErrored();
                    }
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
        while (this.state === "connecting") {
            await new Promise<void>(resolve => this.connectResultListener.push(resolve));
        }
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
                    this.socket.close(3000);
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
                logWarn(LogCategory.NETWORKING, tr("Failed to close the web socket to %s: %o"), this.socketUrl(), error);
            }

            this.socket = undefined;
        }

        this.bytesReceived = 0;
        this.bytesSend = 0;

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

    sendMessage(message: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if(typeof message === "string") {
            this.bytesSend += message.length;
        } else if(message instanceof ArrayBuffer) {
            this.bytesSend += message.byteLength;
        }

        this.socket.send(message);
    }
}