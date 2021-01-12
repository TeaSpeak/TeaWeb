export type NativeClientVersionInfo = {
    version: string,

    os_architecture: string,
    os_platform: string,
    os_platform_version: string
}

export interface NativeClientBackend {
    openChangeLog() : void;
    openClientUpdater() : void;
    quit() : void;

    showDeveloperOptions() : boolean;
    openDeveloperTools() : void;
    reloadWindow() : void;

    getVersionInfo() : NativeClientVersionInfo;
}