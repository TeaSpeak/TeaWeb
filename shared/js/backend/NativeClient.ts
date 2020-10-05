export interface NativeClientBackend {
    openChangeLog() : void;
    openClientUpdater() : void;
    quit() : void;

    showDeveloperOptions() : boolean;
    openDeveloperTools() : void;
    reloadWindow() : void;
}