/// <reference path="../client.ts" />
/// <reference path="modal/ModalSettings.ts" />
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
    constructor(handle, htmlTag) {
        this.handle = handle;
        this.htmlTag = htmlTag;
    }
    initialise() {
        this.htmlTag.find(".btn_connect").click(this.onConnect.bind(this));
        this.htmlTag.find(".btn_client_away").click(this.onAway.bind(this));
        this.htmlTag.find(".btn_mute_input").click(this.onInputMute.bind(this));
        this.htmlTag.find(".btn_mute_output").click(this.onOutputMute.bind(this));
        this.htmlTag.find(".btn_open_settings").click(this.onOpenSettings.bind(this));
        //Need an initialise
        this.muteInput = this.handle.settings.global("mute_input") == "1";
        this.muteOutput = this.handle.settings.global("mute_output") == "1";
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
    set muteInput(flag) {
        if (this._muteInput == flag)
            return;
        this._muteInput = flag;
        let tag = this.htmlTag.find(".btn_mute_input");
        if (flag) {
            if (!tag.hasClass("activated"))
                tag.addClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-input_muted");
        }
        else {
            if (tag.hasClass("activated"))
                tag.removeClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-capture");
        }
        if (this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_input_muted: this._muteInput ? 1 : 0
            });
        this.handle.settings.changeGlobal("mute_input", this._muteInput ? "1" : "0");
        this.updateMicrophoneRecordState();
    }
    set muteOutput(flag) {
        if (this._muteOutput == flag)
            return;
        this._muteOutput = flag;
        let tag = this.htmlTag.find(".btn_mute_output");
        if (flag) {
            if (!tag.hasClass("activated"))
                tag.addClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-output_muted");
        }
        else {
            if (tag.hasClass("activated"))
                tag.removeClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-volume");
        }
        if (this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_output_muted: this._muteOutput ? 1 : 0
            });
        this.handle.settings.changeGlobal("mute_output", this._muteOutput ? "1" : "0");
        this.updateMicrophoneRecordState();
    }
    set away(value) {
        if (typeof (value) == "boolean") {
            if (this._away == value)
                return;
            this._away = value;
            this._awayMessage = "";
        }
        else {
            this._awayMessage = value;
            this._away = true;
        }
        let tag = this.htmlTag.find(".btn_client_away");
        if (this._away) {
            if (!tag.hasClass("activated"))
                tag.addClass("activated");
        }
        else {
            if (tag.hasClass("activated"))
                tag.removeClass("activated");
        }
        if (this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_away: this._away ? 1 : 0,
                client_away_message: this._awayMessage
            });
        this.updateMicrophoneRecordState();
    }
    updateMicrophoneRecordState() {
        let enabled = !this._muteInput && !this._muteOutput && !this._away;
        this.handle.voiceConnection.voiceRecorder.update(enabled);
    }
    updateProperties() {
        if (this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_input_muted: this._muteInput ? 1 : 0,
                client_output_muted: this._muteOutput ? 1 : 0,
                client_away: this._away ? 1 : 0,
                client_away_message: this._awayMessage,
            });
    }
    onOpenSettings() {
        Modals.spawnSettingsModal();
    }
    onConnect() {
        Modals.spawnConnectModal(this.handle.settings.static("connect_default_host"));
    }
}
//# sourceMappingURL=ControlBar.js.map