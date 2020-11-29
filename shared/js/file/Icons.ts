import {Registry} from "tc-shared/events";
import { tr, tra } from "tc-shared/i18n/localize";

export const kIPCIconChannel = "icons";
export const kGlobalIconHandlerId = "global";

export interface RemoteIconEvents {
    notify_state_changed: { oldState: RemoteIconState, newState: RemoteIconState }
}

export type RemoteIconState = "loading" | "loaded" | "error" | "empty" | "destroyed";

export type RemoteIconInfo = {
    iconId: number,
    serverUniqueId: string,
    handlerId?: string
}

export abstract class RemoteIcon {
    readonly events: Registry<RemoteIconEvents>;
    readonly iconId: number;
    readonly serverUniqueId: string;

    private state: RemoteIconState;

    protected imageUrl: string;
    protected errorMessage: string;

    protected constructor(serverUniqueId: string, iconId: number) {
        this.events = new Registry<RemoteIconEvents>();
        this.iconId = iconId;
        this.serverUniqueId = serverUniqueId;

        this.state = "loading";
    }

    destroy() {
        this.setState("destroyed");
        this.events.destroy();
        this.imageUrl = undefined;
    }

    getState() : RemoteIconState {
        return this.state;
    }

    protected setState(state: RemoteIconState) {
        if(this.state === state) {
            return;
        } else if(this.state === "destroyed") {
            throw tr("remote icon has been destroyed");
        }

        const oldState = this.state;
        this.state = state;
        this.events.fire("notify_state_changed", { newState: state, oldState: oldState });
    }

    hasImageUrl() : boolean {
        return !!this.imageUrl;
    }

    /**
     * Will throw an string if the icon isn't in loaded state
     */
    getImageUrl() : string {
        if(this.state !== "loaded") {
            throw tr("icon image url is only available when the state is loaded");
        }

        if(!this.imageUrl) {
            throw tra("remote {} icon is missing an image url", this.iconId);
        }

        return this.imageUrl;
    }

    protected setImageUrl(url: string) {
        if(this.imageUrl) {
            throw tr("an image url has already been set");
        }

        this.imageUrl = url;
    }

    /**
     * Will throw an string if the state isn't error
     */
    getErrorMessage() : string | undefined {
        if(this.state !== "error") {
            throw tr("invalid remote icon state, expected error");
        }

        return this.errorMessage;
    }

    protected setErrorMessage(message: string) {
        this.errorMessage = message;
    }

    /**
     * Waits 'till the icon has been loaded or any other, non loading, state has been reached.
     */
    async awaitLoaded() {
        while(!this.isLoaded()) {
            await new Promise(resolve => this.events.one("notify_state_changed", resolve));
        }
    }

    /**
     * Returns true if the icon isn't loading any more.
     * This includes all other states like error, destroy or empty.
     */
    isLoaded() : boolean {
        return this.state !== "loading";
    }
}

export abstract class AbstractIconManager {
    protected static iconUniqueKey(iconId: number, serverUniqueId: string) : string {
        return "v2-" + serverUniqueId + "-" + iconId;
    }

    /**
     * @param iconId The requested icon
     * @param serverUniqueId The server unique id for the icon
     * @param handlerId Hint which connection handler should be used if we're downloading the icon
     */
    abstract resolveIcon(iconId: number, serverUniqueId: string, handlerId?: string) : RemoteIcon;
}

let globalIconManager: AbstractIconManager;
export function setIconManager(instance: AbstractIconManager) {
    if(globalIconManager) {
        throw "the global icon manager has already been set";
    }

    globalIconManager = instance;
}

export function getIconManager() {
    return globalIconManager;
}


/* a helper for legacy code */
export function generateIconJQueryTag(icon: RemoteIcon | undefined, options?: { animate?: boolean }) : JQuery<HTMLDivElement> {
    options = options || {};

    let icon_container = $.spawn("div").addClass("icon-container icon_empty");
    let icon_load_image = $.spawn("div").addClass("icon_loading");

    const icon_image = $.spawn("img").attr("width", 16).attr("height", 16).attr("alt", "");

    if (icon.iconId == 0) {
        icon_load_image = undefined;
    } else if (icon.iconId < 1000) {
        icon_load_image = undefined;
        icon_container.removeClass("icon_empty").addClass("icon_em client-group_" + icon.iconId);
    } else {
        const loading_done = sync => {//TODO: Show error?
            if (icon.getState() === "empty") {
                icon_load_image.remove();
                icon_load_image = undefined;
            } else if (icon.getState() === "error") {
                //TODO: Error icon?
                icon_load_image.remove();
                icon_load_image = undefined;
            } else {
                icon_image.attr("src", icon.getImageUrl());
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

        if(icon.isLoaded()) {
            loading_done(true);
        } else {
            icon.awaitLoaded().then(() => loading_done(false));
        }
    }

    if (icon_load_image) {
        icon_load_image.appendTo(icon_container);
    }
    return icon_container;
}