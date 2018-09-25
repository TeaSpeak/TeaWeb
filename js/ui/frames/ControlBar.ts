/// <reference path="../../client.ts" />
/// <reference path="../modal/ModalSettings.ts" />
/*
        client_output_hardware Value: '1'
        client_output_muted Value: '0'
        client_outputonly_muted Value: '0'

        client_input_hardware Value: '1'
        client_input_muted Value: '0'

        client_away Value: '0'
        client_away_message Value: ''
 */
class ControlBar {
    private _muteInput: boolean;
    private _muteOutput: boolean;
    private _away: boolean;
    private _awayMessage: string;

    private codec_supported: boolean = false;
    private support_playback: boolean = false;
    private support_record: boolean = false;

    readonly handle: TSClient;
    htmlTag: JQuery;

    constructor(handle: TSClient, htmlTag: JQuery) {
        this.handle = handle;
        this.htmlTag = htmlTag;
    }

    initialise() {
        this.htmlTag.find(".btn_connect").on('click', this.onConnect.bind(this));
        this.htmlTag.find(".btn_disconnect").on('click', this.onDisconnect.bind(this));
        this.htmlTag.find(".btn_mute_input").on('click', this.onInputMute.bind(this));
        this.htmlTag.find(".btn_mute_output").on('click', this.onOutputMute.bind(this));
        this.htmlTag.find(".btn_open_settings").on('click', this.onOpenSettings.bind(this));

        {
            let tokens = this.htmlTag.find(".btn_token");
            tokens.find(".button-dropdown").on('click', () => {
                tokens.find(".dropdown").addClass("displayed");
            });
            tokens.on('mouseleave', () => {
                tokens.find(".dropdown").removeClass("displayed");
            });

            tokens.find(".btn_token_use").on('click', this.on_token_use.bind(this));
            tokens.find(".btn_token_list").on('click', this.on_token_list.bind(this));
        }
        {
            let away = this.htmlTag.find(".btn_away");
            away.find(".button-dropdown").on('click', () => {
                away.find(".dropdown").addClass("displayed");
            });
            away.on('mouseleave', () => {
                away.find(".dropdown").removeClass("displayed");
            });

            away.find(".btn_away_toggle").on('click', this.on_away_toggle.bind(this));
            away.find(".btn_away_message").on('click', this.on_away_set_message.bind(this));
        }

        //Need an initialise
        this.muteInput = settings.global("mute_input") == "1";
        this.muteOutput = settings.global("mute_output") == "1";
    }


    on_away_toggle() {
        this._awayMessage = "";
        this.away = !this._away;
    }

    on_away_set_message() {
        createInputModal("Set away message", "Please enter the away message", message => true, message => {
            if(message)
                this.away = message;
        }).open();
    }

    onInputMute() {
        this.muteInput = !this._muteInput;
    }

    onOutputMute() {
        this.muteOutput = !this._muteOutput;
    }

    set muteInput(flag: boolean) {
        if(this._muteInput == flag) return;
        this._muteInput = flag;

        let tag = this.htmlTag.find(".btn_mute_input");
        if(flag) {
            if(!tag.hasClass("activated"))
                tag.addClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-input_muted");
        } else {
            if(tag.hasClass("activated"))
                tag.removeClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-capture");
        }


        if(this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_input_muted: this._muteInput
            });
        settings.changeGlobal("mute_input", this._muteInput);
        this.updateMicrophoneRecordState();
    }

    get muteOutput() : boolean { return this._muteOutput; }

    set muteOutput(flag: boolean) {
        if(this._muteOutput == flag) return;
        this._muteOutput = flag;

        let tag = this.htmlTag.find(".btn_mute_output");
        if(flag) {
            if(!tag.hasClass("activated"))
                tag.addClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-output_muted");
        } else {
            if(tag.hasClass("activated"))
                tag.removeClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-volume");
        }

        if(this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_output_muted: this._muteOutput
            });
        settings.changeGlobal("mute_output", this._muteOutput);
        this.updateMicrophoneRecordState();
    }

    set away(value: boolean | string) {
        if(typeof(value) == "boolean") {
            if(this._away == value) return;
            this._away = value;
            this._awayMessage = "";
        } else {
            this._awayMessage = value;
            this._away = true;
        }

        let tag = this.htmlTag.find(".btn_away_toggle");
        if( this._away) {
            tag.addClass("activated");
        } else {
            tag.removeClass("activated");
        }

        if(this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_away: this._away,
                client_away_message: this._awayMessage
            });
        this.updateMicrophoneRecordState();
    }

    private updateMicrophoneRecordState() {
        let enabled = !this._muteInput && !this._muteOutput && !this._away;
        this.handle.voiceConnection.voiceRecorder.update(enabled);
    }

    updateProperties() {
        if(this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_input_muted: this._muteInput,
                client_output_muted: this._muteOutput,
                client_away: this._away,
                client_away_message: this._awayMessage,
                client_input_hardware: this.codec_supported && this.support_record,
                client_output_hardware: this.codec_supported && this.support_playback
            });
    }

    updateVoice(targetChannel?: ChannelEntry) {
        if(!targetChannel) targetChannel = this.handle.getClient().currentChannel();
        let client = this.handle.getClient();

        this.codec_supported = targetChannel ? this.handle.voiceConnection.codecSupported(targetChannel.properties.channel_codec) : true;
        this.support_record = this.handle.voiceConnection.voice_send_support();
        this.support_playback = this.handle.voiceConnection.voice_playback_support();

        this.htmlTag.find(".btn_mute_input").prop("disabled", !this.codec_supported|| !this.support_playback || !this.support_record);
        this.htmlTag.find(".btn_mute_output").prop("disabled", !this.codec_supported || !this.support_playback);
        this.handle.serverConnection.sendCommand("clientupdate", {
            client_input_hardware: this.codec_supported && this.support_record,
            client_output_hardware: this.codec_supported && this.support_playback
        });

        if(!this.codec_supported)
            createErrorModal("Channel codec unsupported", "This channel has an unsupported codec.<br>You cant speak or listen to anybody within this channel!").open();

        /* Update these properties anyways (for case the server fails to handle the command) */
        client.updateVariables(
            {key: "client_input_hardware", value: (this.codec_supported && this.support_record) + ""},
            {key: "client_output_hardware", value: (this.codec_supported && this.support_playback) + ""}
        );
    }

    private onOpenSettings() {
        Modals.spawnSettingsModal();
    }

    private onConnect() {
        Modals.spawnConnectModal(settings.static("connect_default_host", "ts.TeaSpeak.de"));
    }

    update_connection_state() {
        switch (this.handle.serverConnection ? this.handle.serverConnection._connectionState : ConnectionState.UNCONNECTED) {
            case ConnectionState.CONNECTED:
            case ConnectionState.CONNECTING:
            case ConnectionState.INITIALISING:
                this.htmlTag.find(".btn_disconnect").show();
                this.htmlTag.find(".btn_connect").hide();
                break;
            default:
                this.htmlTag.find(".btn_disconnect").hide();
                this.htmlTag.find(".btn_connect").show();
        }
    }

    private onDisconnect() {
        this.handle.handleDisconnect(DisconnectReason.REQUESTED); //TODO message?
        this.update_connection_state();
    }

    private on_token_use() {
        createInputModal("Use token", "Please enter your token/priviledge key", message => message.length > 0, result => {
            if(!result) return;
            if(this.handle.serverConnection.connected)
                this.handle.serverConnection.sendCommand("tokenuse", {
                    token: result
                }).then(() => {
                    createInfoModal("Use token", "Toke successfully used!").open();
                }).catch(error => {
                    createErrorModal("Use token", "Failed to use token: " + (error instanceof CommandResult ? error.message : error)).open();
                });
        }).open();
    }

    private on_token_list() {
        createErrorModal("Not implemented", "Token list is not implemented yet!").open();
    }
}