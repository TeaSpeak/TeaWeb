import {ChannelTree} from "./ChannelTree";
import {ClientEntry, ClientEvents} from "./Client";
import * as log from "../log";
import {LogCategory, logError, logInfo, LogType, logWarn} from "../log";
import {PermissionType} from "../permission/PermissionType";
import {settings, Settings} from "../settings";
import * as contextmenu from "../ui/elements/ContextMenu";
import {MenuEntryType} from "../ui/elements/ContextMenu";
import {Sound} from "../audio/Sounds";
import {createErrorModal, createInfoModal, createInputModal} from "../ui/elements/Modal";
import {CommandResult} from "../connection/ServerConnectionDeclaration";
import {hashPassword} from "../utils/helpers";
import {formatMessage} from "../ui/frames/chat";

import {Registry} from "../events";
import {ChannelTreeEntry, ChannelTreeEntryEvents} from "./ChannelTreeEntry";
import {spawnFileTransferModal} from "../ui/modal/transfer/ModalFileTransfer";
import {ErrorCode} from "../connection/ErrorCode";
import {ClientIcon} from "svg-sprites/client-icons";
import {tr} from "tc-shared/i18n/localize";
import {EventChannelData} from "tc-shared/connectionlog/Definitions";
import {spawnChannelEditNew} from "tc-shared/ui/modal/channel-edit/Controller";
import {spawnInviteGenerator} from "tc-shared/ui/modal/invite/Controller";
import {NoThrow} from "tc-shared/proto";
import {ChannelDescriptionResult} from "tc-shared/tree/ChannelDefinitions";
import {spawnChannelInfo} from "tc-shared/ui/modal/channel-info/Controller";

export enum ChannelType {
    PERMANENT,
    SEMI_PERMANENT,
    TEMPORARY
}
export namespace ChannelType {
    export function normalize(mode: ChannelType) {
        let value: string = ChannelType[mode];
        value = value.toLowerCase();
        return value[0].toUpperCase() + value.substr(1);
    }
}

export enum ChannelSubscribeMode {
    SUBSCRIBED,
    UNSUBSCRIBED,
    INHERITED
}

export enum ChannelConversationMode {
    Public = 0,
    Private = 1,
    None = 2,
}

export enum ChannelSidebarMode {
    Conversation = 0,
    Description = 1,
    FileTransfer = 2,

    /* Only used within client side */
    Unknown = 0xFF
}

export class ChannelProperties {
    channel_order: number = 0;
    channel_name: string = "";
    channel_name_phonetic: string = "";
    channel_topic: string = "";

    channel_password: string = "";

    channel_codec: number = 4;
    channel_codec_quality: number = 6;
    channel_codec_is_unencrypted: boolean = false;

    channel_maxclients: number = -1;
    channel_maxfamilyclients: number = -1;

    channel_needed_talk_power: number = 0;

    channel_flag_permanent: boolean = false;
    channel_flag_semi_permanent: boolean = false;
    channel_flag_default: boolean = false;
    channel_flag_password: boolean = false;
    channel_flag_maxclients_unlimited: boolean = true;
    channel_flag_maxfamilyclients_inherited: boolean = false;
    channel_flag_maxfamilyclients_unlimited: boolean = true;

    channel_icon_id: number = 0;
    channel_delete_delay: number = 0;

    //Only after request
    channel_description: string = "";

    channel_conversation_mode: ChannelConversationMode = ChannelConversationMode.Public;
    channel_conversation_history_length: number = -1;

    channel_sidebar_mode: ChannelSidebarMode = ChannelSidebarMode.Unknown;
}

export interface ChannelEvents extends ChannelTreeEntryEvents {
    notify_properties_updated: {
        updated_properties: {[Key in keyof ChannelProperties]: ChannelProperties[Key]};
        channel_properties: ChannelProperties
    },

    notify_cached_password_updated: {
        reason: "channel-password-changed" | "password-miss-match" | "password-entered";
        new_hash?: string;
    },

    notify_subscribe_state_changed: {
        channel_subscribed: boolean
    },
    notify_collapsed_state_changed: {
        collapsed: boolean
    },
    notify_description_changed: {}
}

export type ChannelNameAlignment = "center" | "right" | "left" | "normal" | "repetitive";
export class ChannelNameParser {
    readonly originalName: string;
    alignment: ChannelNameAlignment;
    text: string; /* does not contain any alignment codes */
    uniqueId: string;

    constructor(name: string, hasParentChannel: boolean) {
        this.originalName = name;
        this.parse(hasParentChannel);
    }

    private parse(hasParentChannel: boolean) {
        this.alignment = "normal";
        if(this.originalName.length < 3) {
            this.text = this.originalName;
            return;
        }


        parseType:
        if(!hasParentChannel && this.originalName.charAt(0) == '[') {
            let end = this.originalName.indexOf(']');
            if(end === -1) {
                break parseType;
            }

            let options = this.originalName.substr(1, end - 1);
            const spacerIndex = options.indexOf("spacer");
            if(spacerIndex === -1) break parseType;
            this.uniqueId = options.substring(spacerIndex + 6);
            options = options.substr(0, spacerIndex);

            if(options.length == 0) {
                options = "l";
            } else if(options.length > 1) {
                options = options[0];
            }

            switch (options) {
                case "r":
                    this.alignment = "right";
                    break;

                case "l":
                    this.alignment = "left";
                    break;

                case "c":
                    this.alignment = "center";
                    break;

                case "*":
                    this.alignment = "repetitive";
                    break;

                default:
                    break parseType;
            }

            this.text = this.originalName.substr(end + 1);
        }

        if(!this.text && this.alignment === "normal") {
            this.text = this.originalName;
        }
    }
}

export class ChannelEntry extends ChannelTreeEntry<ChannelEvents> {
    channelTree: ChannelTree;
    channelId: number;
    parent?: ChannelEntry;
    properties: ChannelProperties = new ChannelProperties();

    channel_previous?: ChannelEntry;
    channel_next?: ChannelEntry;
    child_channel_head?: ChannelEntry;

    readonly events: Registry<ChannelEvents>;

    parsed_channel_name: ChannelNameParser;

    private _family_index: number = 0;

    //HTML DOM elements
    private _destroyed = false;

    private cachedPasswordHash: string;
    private channelDescriptionCacheTimestamp: number;
    private channelDescriptionCallback: ((success: boolean) => void)[];
    private channelDescriptionPromise: Promise<ChannelDescriptionResult>;

    private collapsed: boolean;
    private subscribed: boolean;
    private subscriptionMode: ChannelSubscribeMode;

    private client_list: ClientEntry[] = []; /* this list is sorted correctly! */
    private readonly clientPropertyChangedListener;

    constructor(channelTree: ChannelTree, channelId: number, channelName: string) {
        super();

        this.channelTree = channelTree;
        this.events = new Registry<ChannelEvents>();

        this.subscribed = false;
        this.properties = new ChannelProperties();
        this.channelId = channelId;
        this.properties.channel_name = channelName;
        this.parsed_channel_name = new ChannelNameParser(channelName, false);

        this.clientPropertyChangedListener = (event: ClientEvents["notify_properties_updated"]) => {
            if("client_nickname" in event.updated_properties || "client_talk_power" in event.updated_properties) {
                this.reorderClientList(true);
            }
        };

        this.events.on("notify_properties_updated", event => {
            this.channelTree?.events.fire("notify_channel_updated", {
                channel: this,
                channelProperties: event.channel_properties,
                updatedProperties: event.updated_properties
            });
        });

        this.collapsed = this.channelTree.client.settings.getValue(Settings.FN_SERVER_CHANNEL_COLLAPSED(this.channelId));
        this.subscriptionMode = this.channelTree.client.settings.getValue(Settings.FN_SERVER_CHANNEL_SUBSCRIBE_MODE(this.channelId), ChannelSubscribeMode.INHERITED);

        this.channelDescriptionCacheTimestamp = 0;
        this.channelDescriptionCallback = [];
    }

    destroy() {
        this._destroyed = true;

        this.channelDescriptionCallback.forEach(callback => callback(false));
        this.channelDescriptionCallback = [];

        this.client_list.forEach(e => this.unregisterClient(e, true));
        this.client_list = [];

        this.channel_previous = undefined;
        this.parent = undefined;
        this.channel_next = undefined;
        this.channelTree = undefined;
    }

    channelName(){
        return this.properties.channel_name;
    }

    channelDepth() {
        let depth = 0;
        let parent = this.parent;
        while(parent) {
            depth++;
            parent = parent.parent;
        }
        return depth;
    }

    formattedChannelName() {
        return this.parsed_channel_name.text;
    }

    clearDescriptionCache() {
        this.channelDescriptionPromise = undefined;
        this.channelDescriptionCacheTimestamp = 0;
    }

    @NoThrow
    async getChannelDescription(ignoreCache: boolean) : Promise<ChannelDescriptionResult> {
        if(ignoreCache || Date.now() - 120 * 1000 > this.channelDescriptionCacheTimestamp) {
            this.channelDescriptionPromise = this.doGetChannelDescriptionNew();
        }

        return await this.channelDescriptionPromise;
    }

    @NoThrow
    private async doGetChannelDescriptionNew() : Promise<ChannelDescriptionResult> {
        try {
            await this.channelTree.client.serverConnection.send_command("channelgetdescription", {
                cid: this.channelId
            }, {
                process_result: false
            });
        } catch (error) {
            if(error instanceof CommandResult) {
                if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    return {
                        status: "no-permissions",
                        failedPermission: this.channelTree.client.permissions.getFailedPermission(error)
                    }
                } else {
                    return {
                        status: "error",
                        message: error.formattedMessage()
                    }
                }
            } else if(typeof error === "string") {
                return {
                    status: "error",
                    message: error
                }
            } else {
                logError(LogCategory.CHANNEL, tr("Failed to query channel description for channel %d: %o"), this.channelId, error);
                return {
                    status: "error",
                    message: tr("lookup the console")
                };
            }
        }

        if(!this.channelDescriptionCacheTimestamp) {
            /* since the channel description is a low command it will not be processed later */
            const result = await new Promise(resolve => {
                this.channelDescriptionCallback.push(resolve);
                setTimeout(() => {
                    this.channelDescriptionCallback.remove(resolve);
                    resolve(false);
                }, 5000);
            });

            if(!result) {
                return { status: "error", message: tr("description query failed") };
            }
        }

        if(!this.properties.channel_description) {
            return { status: "empty" };
        }

        return {
            status: "success",
            description: this.properties.channel_description,
            handlerId: this.channelTree.client.handlerId
        };
    }

    isDescriptionCached() {
        return this.channelDescriptionCacheTimestamp > Date.now() - 120 * 1000;
    }

    registerClient(client: ClientEntry) {
        client.events.on("notify_properties_updated", this.clientPropertyChangedListener);
        this.client_list.push(client);
        this.reorderClientList(false);
    }

    unregisterClient(client: ClientEntry, noEvent?: boolean) {
        client.events.off("notify_properties_updated", this.clientPropertyChangedListener);
        if(!this.client_list.remove(client)) {
            logWarn(LogCategory.CHANNEL, tr("Unregistered unknown client from channel %s"), this.channelName());
        }
    }

    private reorderClientList(fire_event: boolean) {
        const original_list = this.client_list.slice(0);

        this.client_list.sort((a, b) => {
            if(a.properties.client_talk_power < b.properties.client_talk_power)
                return 1;
            if(a.properties.client_talk_power > b.properties.client_talk_power)
                return -1;

            if(a.properties.client_nickname > b.properties.client_nickname)
                return 1;
            if(a.properties.client_nickname < b.properties.client_nickname)
                return -1;

            return 0;
        });

        if(fire_event) {
            /* only fire if really something has changed ;) */
            for(let index = 0; index < this.client_list.length; index++) {
                if(this.client_list[index] !== original_list[index]) {
                    this.channelTree.events.fire("notify_channel_client_order_changed", { channel: this });
                    break;
                }
            }
        }
    }

    parent_channel() { return this.parent; }
    hasParent(){ return this.parent != null; }
    getChannelId(){ return this.channelId; }

    children(deep = false) : ChannelEntry[] {
        const result: ChannelEntry[] = [];
        let head = this.child_channel_head;
        while(head) {
            result.push(head);
            head = head.channel_next;
        }

        if(deep)
            return result.map(e => e.children(true)).reduce((prv, now) => { prv.push(...now); return prv; }, []);
        return result;
    }

    clients(deep = false) : ClientEntry[] {
        const result: ClientEntry[] = this.client_list.slice(0);
        if(!deep) return result;

        return this.children(true).map(e => e.clients(false)).reduce((prev, cur) => {
            prev.push(...cur);
            return cur;
        }, result);
    }

    channelClientsOrdered() : ClientEntry[] {
        return this.client_list;
    }

    calculate_family_index(enforce_recalculate: boolean = false) : number {
        if(this._family_index !== undefined && !enforce_recalculate)
            return this._family_index;

        this._family_index = 0;

        let channel = this.parent_channel();
        while(channel) {
            this._family_index++;
            channel = channel.parent_channel();
        }

        return this._family_index;
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        let channelCreate = !![
            PermissionType.B_CHANNEL_CREATE_TEMPORARY,
            PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT,
            PermissionType.B_CHANNEL_CREATE_PERMANENT
        ].find(e => this.channelTree.client.permissions.neededPermission(e).granted(1));

        let channelModify = !![
            PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT,
            PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT,
            PermissionType.B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT,
            PermissionType.B_CHANNEL_MODIFY_MAKE_TEMPORARY,
            PermissionType.B_CHANNEL_MODIFY_NAME,
            PermissionType.B_CHANNEL_MODIFY_TOPIC,
            PermissionType.B_CHANNEL_MODIFY_DESCRIPTION,
            PermissionType.B_CHANNEL_MODIFY_PASSWORD,
            PermissionType.B_CHANNEL_MODIFY_CODEC,
            PermissionType.B_CHANNEL_MODIFY_CODEC_QUALITY,
            PermissionType.B_CHANNEL_MODIFY_CODEC_LATENCY_FACTOR,
            PermissionType.B_CHANNEL_MODIFY_MAXCLIENTS,
            PermissionType.B_CHANNEL_MODIFY_MAXFAMILYCLIENTS,
            PermissionType.B_CHANNEL_MODIFY_SORTORDER,
            PermissionType.B_CHANNEL_MODIFY_NEEDED_TALK_POWER,
            PermissionType.B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED,
            PermissionType.B_CHANNEL_MODIFY_TEMP_DELETE_DELAY,
            PermissionType.B_ICON_MANAGE
        ].find(e => this.channelTree.client.permissions.neededPermission(e).granted(1));

        let flagDelete = true;
        if(this.clients(true).length > 0)
            flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_FLAG_FORCE).granted(1);
        if(flagDelete) {
            if (this.properties.channel_flag_permanent)
                flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_PERMANENT).granted(1);
            else if (this.properties.channel_flag_semi_permanent)
                flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_PERMANENT).granted(1);
            else
                flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_TEMPORARY).granted(1);
        }

        let trigger_close = true;

        const collapse_expendable = !!this.child_channel_head || this.client_list.length > 0;
        const bold = text => contextmenu.get_provider().html_format_enabled() ? "<b>" + text + "</b>" : text;
        contextmenu.spawn_context_menu(x, y, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_switch",
                name: bold(tr("Switch to channel")),
                callback: () => this.joinChannel(),
                visible: this !== this.channelTree.client.getClient()?.currentChannel()
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-filetransfer",
                name: bold(tr("Open channel file browser")),
                callback: () => spawnFileTransferModal(this.getChannelId()),
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_switch",
                name: bold(tr("Join text channel")),
                callback: () => {
                    const conversation = this.channelTree.client.getChannelConversations().findOrCreateConversation(this.getChannelId());
                    this.channelTree.client.getChannelConversations().setSelectedConversation(conversation);
                    this.channelTree.client.getSideBar().showChannel();
                },
                visible: !settings.getValue(Settings.KEY_SWITCH_INSTANT_CHAT)
            }, {
                type: contextmenu.MenuEntryType.HR,
                name: ''
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Show channel info"),
                callback: () => {
                    trigger_close = false;
                    spawnChannelInfo(this);
                },
                icon_class: "client-about"
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Invite People"),
                callback: () => spawnInviteGenerator(this),
                icon_class: ClientIcon.InviteBuddy
            },
            ...(() => {
                const local_client = this.channelTree.client.getClient();
                if (!local_client || local_client.currentChannel() !== this)
                    return [
                        contextmenu.Entry.HR(),
                        {
                            type: contextmenu.MenuEntryType.ENTRY,
                            icon: "client-subscribe_to_channel",
                            name: bold(tr("Subscribe to channel")),
                            callback: () => this.subscribe(),
                            visible: !this.isSubscribed()
                        },
                        {
                            type: contextmenu.MenuEntryType.ENTRY,
                            icon: "client-channel_unsubscribed",
                            name: bold(tr("Unsubscribe from channel")),
                            callback: () => this.unsubscribe(),
                            visible: this.isSubscribed()
                        },
                        {
                            type: contextmenu.MenuEntryType.ENTRY,
                            icon: "client-subscribe_mode",
                            name: bold(tr("Use inherited subscribe mode")),
                            callback: () => this.unsubscribe(true),
                            visible: this.subscriptionMode != ChannelSubscribeMode.INHERITED
                        }
                    ];
                return [];
            })(),
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_edit",
                name: tr("Edit channel"),
                invalidPermission: !channelModify,
                callback: () => {
                    spawnChannelEditNew(this.channelTree.client, this, this.parent, (properties, permissions) => {
                        const changedProperties = Object.keys(properties);
                        if(changedProperties.length > 0) {
                            properties["cid"] = this.channelId;
                            this.channelTree.client.serverConnection.send_command("channeledit", properties).then(() => {
                                this.channelTree.client.sound.play(Sound.CHANNEL_EDITED_SELF);
                            });
                            logInfo(LogCategory.CHANNEL, tr("Changed channel properties of channel %s: %o"), this.channelName(), properties);
                        }

                        if(permissions.length > 0) {
                            let perms = [];
                            for(let perm of permissions) {
                                perms.push({
                                    permvalue: perm.value,
                                    permnegated: false,
                                    permskip: false,
                                    permsid: perm.permission
                                });
                            }

                            perms[0]["cid"] = this.channelId;
                            this.channelTree.client.serverConnection.send_command("channeladdperm", perms, {
                                flagset: ["continueonerror"]
                            }).then(() => {
                                this.channelTree.client.sound.play(Sound.CHANNEL_EDITED_SELF);
                            });
                        }
                    });
                }
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_delete",
                name: tr("Delete channel"),
                invalidPermission: !flagDelete,
                callback: () => {
                    this.channelTree.client.serverConnection.send_command("channeldelete", {cid: this.channelId});
                }
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-addon-collection",
                name: tr("Create music bot"),
                callback: () => {
                    this.channelTree.client.serverConnection.send_command("musicbotcreate", {cid: this.channelId}).then(() => {
                        createInfoModal(tr("Bot successfully created"), tr("Bot has been successfully created.")).open();
                    }).catch(error => {
                        if(error instanceof CommandResult) {
                            error = error.extra_message || error.message;
                        }

                        createErrorModal(tr("Failed to create bot"), formatMessage(tr("Failed to create the music bot:<br>{0}"), error)).open();
                    });
                }
            },
            {
                type: MenuEntryType.HR,
                name: "",
                visible: collapse_expendable
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_collapse_all",
                name: tr("Collapse sub channels"),
                visible: collapse_expendable,
                callback: () => this.channelTree.collapse_channels(this)
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_expand_all",
                name: tr("Expend sub channels"),
                visible: collapse_expendable,
                callback: () => this.channelTree.expand_channels(this)
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_create_sub",
                name: tr("Create sub channel"),
                invalidPermission: !(channelCreate && this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_CHILD).granted(1)),
                callback: () => this.channelTree.spawnCreateChannel(this)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_create",
                name: tr("Create channel"),
                invalidPermission: !channelCreate,
                callback: () => this.channelTree.spawnCreateChannel()
            },
            contextmenu.Entry.CLOSE(() => trigger_close && on_close ? on_close() : {})
        );
    }

    updateVariables(...variables: {key: string, value: string}[]) {
        let group;
        if(__build.mode === "debug") {
            group = log.group(log.LogType.DEBUG, LogCategory.CHANNEL_PROPERTIES, tr("Update properties (%i) of %s (%i)"), variables.length, this.channelName(), this.getChannelId());

            {
                const entries = [];
                for(const variable of variables)
                    entries.push({
                        key: variable.key,
                        value: variable.value,
                        type: typeof (this.properties[variable.key])
                    });
                log.table(LogType.DEBUG, LogCategory.PERMISSIONS, "Clannel update properties", entries);
            }
        }

        /* TODO: Validate values. Example: channel_conversation_mode */

        for(const variable of variables) {
            let key = variable.key;
            let value = variable.value;

            const hasUpdate = JSON.map_field_to(this.properties, value, variable.key);

            if(key == "channel_description") {
                this.channelDescriptionCacheTimestamp = Date.now();
                this.channelDescriptionCallback.forEach(callback => callback(true));
                this.channelDescriptionCallback = [];
            }

            if(hasUpdate) {
                if(key == "channel_name") {
                    this.parsed_channel_name = new ChannelNameParser(value, this.hasParent());
                } else if(key == "channel_order") {
                    let order = this.channelTree.findChannel(this.properties.channel_order);
                    this.channelTree.moveChannel(this, order, this.parent, false);
                } else if(key === "channel_icon_id") {
                    this.properties.channel_icon_id = variable.value as any >>> 0; /* unsigned 32 bit number! */
                } else if(key === "channel_flag_conversation_private") {
                    /* "fix" for older TeaSpeak server versions (pre. 1.4.22) */
                    this.properties.channel_conversation_mode = value === "1" ? 0 : 1;
                    variables.push({ key: "channel_conversation_mode", value: this.properties.channel_conversation_mode + "" });
                }
            }
        }

        group?.end();

        {
            let properties = {};
            for(const property of variables)
                properties[property.key] = this.properties[property.key];
            this.events.fire("notify_properties_updated", { updated_properties: properties as any, channel_properties: this.properties });
        }
    }

    generateBBCode() {
        return "[url=channel://" + this.channelId + "/" + encodeURIComponent(this.properties.channel_name) + "]" + this.formattedChannelName() + "[/url]";
    }

    getChannelType() : ChannelType {
        if(this.properties.channel_flag_permanent == true) {
            return ChannelType.PERMANENT;
        } else if(this.properties.channel_flag_semi_permanent == true) {
            return ChannelType.SEMI_PERMANENT;
        } else {
            return ChannelType.TEMPORARY;
        }
    }

    async joinChannel(ignorePasswordFlag?: boolean) : Promise<boolean> {
        if(this.channelTree.client.getClient().currentChannel() === this) {
            return true;

        }

        let passwordPrompted = false;
        if(this.properties.channel_flag_password === true && !this.cachedPasswordHash && !ignorePasswordFlag) {
            passwordPrompted = true;
            const password = await this.requestChannelPassword(PermissionType.B_CHANNEL_JOIN_IGNORE_PASSWORD);
            if(typeof password === "undefined") {
                /* aborted */
                return;
            }
        }

        try {
            await this.channelTree.client.serverConnection.send_command("clientmove", {
                "clid": this.channelTree.client.getClientId(),
                "cid": this.getChannelId(),
                "cpw": this.cachedPasswordHash || ""
            });
            this.channelTree.client.sound.play(Sound.CHANNEL_JOINED);
            return true;
        } catch (error) {
            if(error instanceof CommandResult) {
                if(error.id == ErrorCode.CHANNEL_INVALID_PASSWORD) {
                    this.invalidateCachedPassword();
                    if(!passwordPrompted) {
                        /* It seems like our cached password isn't valid any more */
                        return await this.joinChannel(false);
                    }
                }
            }
            return false;
        }
    }

    async requestChannelPassword(ignorePermission: PermissionType) : Promise<{ hash: string } | undefined> {
        if(this.cachedPasswordHash) {
            return { hash: this.cachedPasswordHash };
        }

        if(this.channelTree.client.permissions.neededPermission(ignorePermission).granted(1)) {
            return { hash: "having ignore permission" };
        }

        const password = await new Promise(resolve => createInputModal(tr("Channel password"), tr("Channel password:"), () => true, resolve).open())
        if(typeof(password) !== "string" || !password) {
            return;
        }

        const hash = await hashPassword(password);
        this.cachedPasswordHash = hash;
        this.events.fire("notify_cached_password_updated", { reason: "password-entered", new_hash: hash });
        return { hash: this.cachedPasswordHash };
    }

    invalidateCachedPassword() {
        this.cachedPasswordHash = undefined;
        this.events.fire("notify_cached_password_updated", { reason: "password-miss-match" });
    }

    setCachedHashedPassword(passwordHash: string) {
        this.cachedPasswordHash = passwordHash;
    }

    getCachedPasswordHash() { return this.cachedPasswordHash; }

    async updateSubscribeMode() {
        let shouldBeSubscribed = false;
        switch (this.subscriptionMode) {
            case ChannelSubscribeMode.INHERITED:
                shouldBeSubscribed = this.channelTree.client.isSubscribeToAllChannels();
                break;

            case ChannelSubscribeMode.SUBSCRIBED:
                shouldBeSubscribed = true;
                break;

            case ChannelSubscribeMode.UNSUBSCRIBED:
                shouldBeSubscribed = false;
                break;
        }

        if(this.subscribed === shouldBeSubscribed) {
            return;
        }

        const connection = this.channelTree.client.getServerConnection();
        if(!connection.connected()) {
            this.setSubscribed(false);
            return;
        }

        if(shouldBeSubscribed) {
            await connection.send_command('channelsubscribe', {
                'cid': this.getChannelId()
            });
        } else {
            await connection.send_command('channelunsubscribe', {
                'cid': this.getChannelId()
            });
        }
    }

    async subscribe() : Promise<void> {
        this.setSubscriptionMode(ChannelSubscribeMode.SUBSCRIBED);
    }

    async unsubscribe(inherited_subscription_mode?: boolean) : Promise<void> {
        this.setSubscriptionMode(inherited_subscription_mode ? ChannelSubscribeMode.INHERITED : ChannelSubscribeMode.UNSUBSCRIBED);
    }

    isCollapsed() : boolean {
        return this.collapsed;
    }

    setCollapsed(flag: boolean) {
        if(this.collapsed === flag) {
            return;
        }

        this.collapsed = flag;
        this.events.fire("notify_collapsed_state_changed", { collapsed: flag });
        this.channelTree.client.settings.setValue(Settings.FN_SERVER_CHANNEL_COLLAPSED(this.channelId), flag);
    }

    isSubscribed() : boolean {
        return this.subscribed;
    }

    /* Attention: This method is not to subscribe to a channel! It's used to update the current subscription state.*/
    setSubscribed(flag: boolean) {
        if(this.subscribed === flag) {
            return;
        }

        this.subscribed = flag;
        this.events.fire("notify_subscribe_state_changed", { channel_subscribed: flag });
    }

    getSubscriptionMode() : ChannelSubscribeMode {
        return this.subscriptionMode;
    }

    setSubscriptionMode(mode: ChannelSubscribeMode, dontSyncSubscribeMode?: boolean) {
        if(this.subscriptionMode === mode) {
            return;
        }

        this.subscriptionMode = mode;
        this.channelTree.client.settings.setValue(Settings.FN_SERVER_CHANNEL_SUBSCRIBE_MODE(this.channelId), mode);
        if(!dontSyncSubscribeMode) {
            this.updateSubscribeMode().then(undefined);
        }
    }

    log_data() : EventChannelData {
        return {
            channel_name: this.channelName(),
            channel_id: this.channelId
        }
    }

    getStatusIcon() : ClientIcon | undefined {
        if(this.parsed_channel_name.alignment !== "normal") {
            return undefined;
        }

        const subscribed = this.isSubscribed();
        if (this.properties.channel_flag_password === true && !this.getCachedPasswordHash()) {
            return subscribed ? ClientIcon.ChannelYellowSubscribed : ClientIcon.ChannelYellow;
        } else if (!this.properties.channel_flag_maxclients_unlimited && this.clients().length >= this.properties.channel_maxclients) {
            return subscribed ? ClientIcon.ChannelRedSubscribed : ClientIcon.ChannelRed;
        } else if (!this.properties.channel_flag_maxfamilyclients_unlimited && this.properties.channel_maxfamilyclients >= 0 && this.clients(true).length >= this.properties.channel_maxfamilyclients) {
            return subscribed ? ClientIcon.ChannelRedSubscribed : ClientIcon.ChannelRed;
        } else {
            return subscribed ? ClientIcon.ChannelGreenSubscribed : ClientIcon.ChannelGreen;
        }
    }

    handleDescriptionChanged() {
        if(!this.channelDescriptionCacheTimestamp) {
            return;
        }

        this.channelDescriptionCacheTimestamp = 0;
        this.properties.channel_description = undefined;
        this.events.fire("notify_description_changed");
    }
}