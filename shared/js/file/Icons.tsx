import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {Registry} from "tc-shared/events";
import {format_time} from "tc-shared/ui/frames/chat";
import {CommandResult, ErrorID} from "tc-shared/connection/ServerConnectionDeclaration";
import {
    DownloadKey,
    FileEntry,
    FileManager, transfer_provider
} from "tc-shared/file/FileManager";
import {image_type, ImageCache, ImageType, media_image_type} from "tc-shared/file/ImageCache";

const icon_cache: ImageCache = new ImageCache("icons");
export interface IconManagerEvents {
    notify_icon_state_changed: {
        icon_id: number,
        server_unique_id: string,

        icon: LocalIcon
    },
}

//TODO: Invalidate icon after certain time if loading has failed and try to redownload (only if an icon loader has been set!)
export type IconLoader = (icon?: LocalIcon) => Promise<Response>;
export class LocalIcon {
    readonly icon_id: number;
    readonly server_unique_id: string;
    readonly status_change_callbacks: ((icon?: LocalIcon) => void)[] = [];

    status: "loading" | "loaded" | "empty" | "error" | "destroyed";

    loaded_url?: string;
    error_message?: string;

    private callback_icon_loader: IconLoader;

    constructor(id: number, server: string, loader_or_response: Response | IconLoader | undefined) {
        this.icon_id = id;
        this.server_unique_id = server;

        if(id >= 0 && id <= 1000) {
            /* Internal TeaSpeak icons. These must be handled differently! */
            this.status = "loaded";
        } else {
            this.status = "loading";
            if(loader_or_response instanceof Response) {
                this.set_image(loader_or_response).catch(error => {
                    log.error(LogCategory.GENERAL, tr("Icon set image method threw an unexpected error: %o"), error);
                    this.status = "error";
                    this.error_message = "unexpected parse error";
                    this.triggerStatusChange();
                });
            } else {
                this.callback_icon_loader = loader_or_response;
                this.load().catch(error => {
                    log.error(LogCategory.GENERAL, tr("Icon load method threw an unexpected error: %o"), error);
                    this.status = "error";
                    this.error_message = "unexpected load error";
                    this.triggerStatusChange();
                }).then(() => {
                    this.callback_icon_loader = undefined; /* release resources captured by possible closures */
                });
            }
        }
    }

    private triggerStatusChange() {
        for(const lister of this.status_change_callbacks.slice(0))
            lister(this);
    }

    /* called within the CachedIconManager */
    protected destroy() {
        if(typeof this.loaded_url === "string" && URL.revokeObjectURL)
            URL.revokeObjectURL(this.loaded_url);

        this.status = "destroyed";
        this.loaded_url = undefined;
        this.error_message = undefined;

        this.triggerStatusChange();
        this.status_change_callbacks.splice(0, this.status_change_callbacks.length);
    }

    private async load() {
        if(!icon_cache.setupped())
            await icon_cache.setup();

        let response = await icon_cache.resolve_cached("icon_" + this.server_unique_id + "_" + this.icon_id); //TODO age!
        if(!response) {
            if(typeof this.callback_icon_loader !== "function") {
                this.status = "empty";
                this.triggerStatusChange();
                return;
            }

            try {
                response = await this.callback_icon_loader(this);
            } catch (error) {
                log.warn(LogCategory.GENERAL, tr("Failed to download icon %d: %o"), this.icon_id, error);
                await this.set_error(typeof error === "string" ? error : tr("Failed to load icon"));
                return;
            }
            try {
                await this.set_image(response);
            } catch (error) {
                log.error(LogCategory.GENERAL, tr("Failed to update icon image for icon %d: %o"), this.icon_id, error);
                await this.set_error(typeof error === "string" ? error : tr("Failed to update icon from downloaded file"));
                return;
            }
            return;
        }

        this.loaded_url = await response_to_url(response);
        this.status = "loaded";
        this.triggerStatusChange();
    }

    async set_image(response: Response) {
        if(this.icon_id >= 0 && this.icon_id <= 1000) throw "Could not set image for internal icon";

        const type = image_type(response.headers.get('X-media-bytes'));
        if(type === ImageType.UNKNOWN) throw "unknown image type";

        const media = media_image_type(type);
        await icon_cache.put_cache("icon_" + this.server_unique_id + "_" + this.icon_id, response.clone(), "image/" + media);

        this.loaded_url = await response_to_url(response);
        this.status = "loaded";
        this.triggerStatusChange();
    }

    set_error(error: string) {
        if(this.status === "loaded" || this.status === "destroyed") return;
        if(this.status === "error" && this.error_message === error) return;
        this.status = "error";
        this.error_message = error;
        this.triggerStatusChange();
    }

    async await_loading() {
        await new Promise(resolve => {
            if(this.status !== "loading") {
                resolve();
                return;
            }
            const callback = () => {
                if(this.status === "loading") return;

                this.status_change_callbacks.remove(callback);
                resolve();
            };
            this.status_change_callbacks.push(callback);
        })
    }
}

async function response_to_url(response: Response) {
    if(!response.headers.has('X-media-bytes'))
        throw "missing media bytes";

    const type = image_type(response.headers.get('X-media-bytes'));
    const media = media_image_type(type);

    const blob = await response.blob();
    if(blob.type !== "image/" + media)
        return URL.createObjectURL(blob.slice(0, blob.size, "image/" + media));
    else
        return URL.createObjectURL(blob)
}

class CachedIconManager {
    private loaded_icons: {[id: string]:LocalIcon} = {};

    async clear_cache() {
        await icon_cache.reset();
        this.clear_memory_cache();
    }

    clear_memory_cache() {
        for(const icon_id of Object.keys(this.loaded_icons))
            this.loaded_icons[icon_id]["destroy"]();
        this.loaded_icons = {};
    }

    load_icon(id: number, server_unique_id: string, fallback_load?: IconLoader) : LocalIcon {
        const cache_id = server_unique_id + "_" + (id >>> 0);
        if(this.loaded_icons[cache_id]) return this.loaded_icons[cache_id];

        return (this.loaded_icons[cache_id] = new LocalIcon(id >>> 0, server_unique_id, fallback_load));
    }

    async put_icon(id: number, server_unique_id: string, icon: Response) {
        const cache_id = server_unique_id + "_" + (id >>> 0);
        if(this.loaded_icons[cache_id])
            await this.loaded_icons[cache_id].set_image(icon);
        else {
            const licon = this.loaded_icons[cache_id] = new LocalIcon(id >>> 0, server_unique_id, icon);
            await new Promise((resolve, reject) => {
                const cb = () => {
                    licon.status_change_callbacks.remove(cb);
                    if(licon.status === "loaded")
                        resolve();
                    else
                        reject(licon.status === "error" ? licon.error_message || tr("Unknown error") : tr("Invalid status"));
                };

                licon.status_change_callbacks.push(cb);
            })
        }
    }
}
export const icon_cache_loader = new CachedIconManager();
window.addEventListener("beforeunload", () => {
    icon_cache_loader.clear_memory_cache();
});

type IconManagerLoadingData = {
    result: "success" | "error" | "unset";
    next_retry?: number;
    error?: string;
}
export class IconManager {
    handle: FileManager;
    readonly events: Registry<IconManagerEvents>;
    private loading_timestamps: {[key: number]: IconManagerLoadingData} = {};

    constructor(handle: FileManager) {
        this.handle = handle;
        this.events = new Registry<IconManagerEvents>();
    }

    destroy() {
        this.loading_timestamps = {};
    }

    async delete_icon(id: number) : Promise<void> {
        if(id <= 1000)
            throw "invalid id!";

        await this.handle.delete_file({
            name: '/icon_' + id
        });
    }

    iconList() : Promise<FileEntry[]> {
        return this.handle.requestFileList("/icons");
    }

    create_icon_download(id: number) : Promise<DownloadKey> {
        return this.handle.download_file("", "/icon_" + id);
    }

    private async server_icon_loader(icon: LocalIcon) : Promise<Response> {
        const loading_data: IconManagerLoadingData = this.loading_timestamps[icon.icon_id] || (this.loading_timestamps[icon.icon_id] = { result: "unset" });
        if(loading_data.result === "error") {
            if(!loading_data.next_retry || loading_data.next_retry > Date.now()) {
                log.debug(LogCategory.GENERAL, tr("Don't retry icon download from server. We'll try again in %s"),
                    !loading_data.next_retry ? tr("never") : format_time(loading_data.next_retry - Date.now(), tr("1 second")));
                throw loading_data.error;
            }
        }

        try {
            let download_key: DownloadKey;
            try {
                download_key = await this.create_icon_download(icon.icon_id);
            } catch(error) {
                if(error instanceof CommandResult) {
                    if(error.id === ErrorID.FILE_NOT_FOUND)
                        throw tr("Icon could not be found");
                    else if(error.id === ErrorID.PERMISSION_ERROR)
                        throw tr("No permissions to download icon");
                    else
                        throw error.extra_message || error.message;
                }
                log.error(LogCategory.CLIENT, tr("Could not request download for icon %d: %o"), icon.icon_id, error);
                throw typeof error === "string" ? error : tr("Failed to initialize icon download");
            }

            const downloader = transfer_provider().spawn_download_transfer(download_key);
            let response: Response;
            try {
                response = await downloader.request_file();
            } catch(error) {
                log.error(LogCategory.CLIENT, tr("Could not download icon %d: %o"), icon.icon_id, error);
                throw "failed to download icon";
            }

            loading_data.result = "success";
            return response;
        } catch (error) {
            loading_data.result = "error";
            loading_data.error = error as string;
            loading_data.next_retry = Date.now() + 300 * 1000;
            throw error;
        }
    }

    static generate_tag(icon: LocalIcon | undefined, options?: {
        animate?: boolean
    }) : JQuery<HTMLDivElement> {
        options = options || {};

        let icon_container = $.spawn("div").addClass("icon-container icon_empty");
        let icon_load_image = $.spawn("div").addClass("icon_loading");

        const icon_image = $.spawn("img").attr("width", 16).attr("height", 16).attr("alt", "");

        if (icon.icon_id == 0) {
            icon_load_image = undefined;
        } else if (icon.icon_id < 1000) {
            icon_load_image = undefined;
            icon_container.removeClass("icon_empty").addClass("icon_em client-group_" + icon.icon_id);
        } else {
            const loading_done = sync => {//TODO: Show error?
                if(icon.status === "empty") {
                    icon_load_image.remove();
                    icon_load_image = undefined;
                } else if(icon.status === "error") {
                    //TODO: Error icon?
                    icon_load_image.remove();
                    icon_load_image = undefined;
                } else {
                    icon_image.attr("src", icon.loaded_url);
                    icon_container.append(icon_image).removeClass("icon_empty");

                    if (!sync && (typeof (options.animate) !== "boolean" || options.animate)) {
                        icon_image.css("opacity", 0);

                        icon_load_image.animate({opacity: 0}, 50, function () {
                            icon_load_image.remove();
                            icon_image.animate({opacity: 1}, 150);
                        });
                    } else {
                        icon_load_image.remove();
                        icon_load_image = undefined;
                    }
                }
            };

            if(icon.status !== "loading")
                loading_done(true);
            else {
                const cb = () => {
                    if(icon.status === "loading") return;

                    icon.status_change_callbacks.remove(cb);
                    loading_done(false);
                };
                icon.status_change_callbacks.push(cb);
            }
        }

        if(icon_load_image)
            icon_load_image.appendTo(icon_container);
        return icon_container;
    }

    generateTag(id: number, options?: {
        animate?: boolean
    }) : JQuery<HTMLDivElement> {
        options = options || {};
        return IconManager.generate_tag(this.load_icon(id), options);
    }

    load_icon(id: number) : LocalIcon {
        const server_uid = this.handle.handle.channelTree.server.properties.virtualserver_unique_identifier;
        let icon = icon_cache_loader.load_icon(id, server_uid, this.server_icon_loader.bind(this));
        if(icon.status !== "loading" && icon.status !== "loaded") {
            this.server_icon_loader(icon).then(response => {
                return icon.set_image(response);
            }).catch(error => {
                console.warn("Failed to update broken cached icon from server: %o", error);
            })
        }
        return icon;
    }
}