declare const native: any; //FIXME: Read client declarations!
namespace connection {
    export interface HandshakeIdentityHandler {
        connection: AbstractServerConnection;

        start_handshake();
        register_callback(callback: (success: boolean, message?: string) => any);
    }

    export class HandshakeHandler {
        private connection: ServerConnection;
        private handshake_handler: HandshakeIdentityHandler;
        private failed = false;

        readonly profile: profiles.ConnectionProfile;
        readonly name: string;
        readonly server_password: string;

        constructor(profile: profiles.ConnectionProfile, name: string, password: string) {
            this.profile = profile;
            this.server_password = password;
            this.name = name;
        }

        setConnection(con: ServerConnection) {
            this.connection = con;
        }

        startHandshake() {
            this.handshake_handler = this.profile.spawn_identity_handshake_handler(this.connection);
            if(!this.handshake_handler) {
                this.handshake_failed("failed to create identity handler");
                return;
            }

            this.handshake_handler.register_callback((flag, message) => {
                if(flag)
                    this.handshake_finished();
                else
                    this.handshake_failed(message);
            });

            this.handshake_handler.start_handshake();
        }

        private handshake_failed(message: string) {
            if(this.failed) return;

            this.failed = true;
            this.connection.client.handleDisconnect(DisconnectReason.HANDSHAKE_FAILED, message);
        }

        private handshake_finished(version?: string) {
            if(native_client && window["native"] && native.client_version && !version) {
                native.client_version()
                    .then( this.handshake_finished.bind(this))
                    .catch(error => {
                        console.error(tr("Failed to get version:"));
                        console.error(error);
                        this.handshake_finished("?.?.?");
                    });
                return;
            }

            const git_version = settings.static_global("version", "unknown");
            const browser_name = (navigator.browserSpecs || {})["name"] || " ";
            let data = {
                //TODO variables!
                client_nickname: this.name,
                client_platform: (browser_name ? browser_name + " " : "") + navigator.platform,
                client_version: "TeaWeb " + git_version + " (" + navigator.userAgent + ")",

                client_server_password: this.server_password,
                client_browser_engine: navigator.product
            };

            if(version) {
                data.client_version = "TeaClient ";
                data.client_version += " " + version;

                const os = require("os");
                const arch_mapping = {
                    "x32": "32bit",
                    "x64": "64bit"
                };

                data.client_version += " " + (arch_mapping[os.arch()] || os.arch());

                const os_mapping = {
                    "win32": "Windows",
                    "linux": "Linux"
                };
                data.client_platform = (os_mapping[os.platform()] || os.platform());
            }

            this.connection.send_command("clientinit", data).catch(error => {
                this.connection.disconnect();
                if(error instanceof CommandResult) {
                    if(error.id == 1028) {
                        this.connection.client.handleDisconnect(DisconnectReason.SERVER_REQUIRES_PASSWORD);
                    } else {

                        this.connection.client.handleDisconnect(DisconnectReason.CLIENT_KICKED, error);
                    }
                }
            });
        }
    }
}