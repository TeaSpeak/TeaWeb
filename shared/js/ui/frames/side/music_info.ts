namespace chat {
    declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
    declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;

    export class MusicInfo {
        readonly handle: Frame;
        private _html_tag: JQuery;
        private _current_bot: MusicClientEntry | undefined;
        previous_frame_content: FrameContent;

        constructor(handle: Frame) {
            this.handle = handle;
            this._build_html_tag();
        }

        html_tag() : JQuery {
            return this._html_tag;
        }

        destroy() {
            this._html_tag && this._html_tag.remove();
            this._html_tag = undefined;

            this._current_bot = undefined;
            this.previous_frame_content = undefined;
        }

        private _build_html_tag() {
            this._html_tag = $("#tmpl_frame_chat_music_info").renderTag();
            this._html_tag.find(".button-close").on('click', () => {
                if(this.previous_frame_content === FrameContent.CLIENT_INFO)
                    this.previous_frame_content = FrameContent.NONE;

                this.handle.set_content(this.previous_frame_content);
            });
        }

        set_current_bot(client: MusicClientEntry | undefined, enforce?: boolean) {
            if(client) client.updateClientVariables(); /* just to ensure */
            if(client === this._current_bot && (typeof(enforce) === "undefined" || !enforce))
                return;

            this._current_bot = client;

        }
    }
}