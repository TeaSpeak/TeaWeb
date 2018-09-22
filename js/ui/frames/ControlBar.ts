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
        this.htmlTag.find(".btn_client_away").on('click', this.onAway.bind(this));
        this.htmlTag.find(".btn_mute_input").on('click', this.onInputMute.bind(this));
        this.htmlTag.find(".btn_mute_output").on('click', this.onOutputMute.bind(this));
        this.htmlTag.find(".btn_open_settings").on('click', this.onOpenSettings.bind(this));


        //Need an initialise
        this.muteInput = settings.global("mute_input") == "1";
        this.muteOutput = settings.global("mute_output") == "1";
    }


    onAway() {
        this.away = !this._away;
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

        let tag = this.htmlTag.find(".btn_client_away");
        if( this._away) {
            if(!tag.hasClass("activated"))
                tag.addClass("activated");
        } else {
            if(tag.hasClass("activated"))
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

        this.codec_supported = this.handle.voiceConnection.codecSupported(targetChannel.properties.channel_codec);
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
}