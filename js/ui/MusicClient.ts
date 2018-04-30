/// <reference path="client.ts" />

class MusicClientProperties extends ClientProperties {
    music_volume: number = 0;
    music_track_id: number = 0;
}

class MusicClientEntry extends ClientEntry {
    constructor(clientId, clientName) {
        super(clientId, clientName, new MusicClientProperties());
    }

    get properties() : MusicClientProperties {
        return this._properties as MusicClientProperties;
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined): void {
        spawnMenu(x, y,
            {
                name: "<b>Change bot name</b>",
                icon: "client-change_nickname",
                disabled: true,
                callback: () => {},
                type: MenuEntryType.ENTRY
            }, {
                name: "Change bot description",
                icon: "client-edit",
                disabled: true,
                callback: () => {},
                type: MenuEntryType.ENTRY
            }, {
                name: "Open music panel",
                icon: "client-edit",
                disabled: true,
                callback: () => {},
                type: MenuEntryType.ENTRY
            },
            MenuEntry.HR(),
            {
                name: "Delete bot",
                icon: "client-delete",
                disabled: true,
                callback: () => {},
                type: MenuEntryType.ENTRY
            },
            MenuEntry.CLOSE(on_close)
        );
    }

    initializeListener(): void {
        super.initializeListener();
    }
}