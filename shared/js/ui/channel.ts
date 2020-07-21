import {ChannelTree} from "tc-shared/ui/view";
import {ClientEntry, ClientEvents} from "tc-shared/ui/client";
import * as log from "tc-shared/log";
import {LogCategory, LogType} from "tc-shared/log";
import {PermissionType} from "tc-shared/permission/PermissionType";
import {settings, Settings} from "tc-shared/settings";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {MenuEntryType} from "tc-shared/ui/elements/ContextMenu";
import {Sound} from "tc-shared/sound/Sounds";
import {createErrorModal, createInfoModal, createInputModal} from "tc-shared/ui/elements/Modal";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import * as htmltags from "./htmltags";
import {hashPassword} from "tc-shared/utils/helpers";
import {openChannelInfo} from "tc-shared/ui/modal/ModalChannelInfo";
import {createChannelModal} from "tc-shared/ui/modal/ModalCreateChannel";
import {formatMessage} from "tc-shared/ui/frames/chat";

import * as React from "react";
import {Registry} from "tc-shared/events";
import {ChannelTreeEntry, ChannelTreeEntryEvents} from "tc-shared/ui/TreeEntry";
import {ChannelEntryView as ChannelEntryView} from "./tree/Channel";
import {spawnFileTransferModal} from "tc-shared/ui/modal/transfer/ModalFileTransfer";
import {ViewReasonId} from "tc-shared/ConnectionHandler";
import {EventChannelData} from "tc-shared/ui/frames/log/Definitions";

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

export class ChannelProperties {
    channel_order: number = 0;
    channel_name: string = "";
    channel_name_phonetic: string = "";
    channel_topic: string = "";

    channel_password: string = "";

    channel_codec: number = 4;
    channel_codec_quality: number = 0;
    channel_codec_is_unencrypted: boolean = false;

    channel_maxclients: number = -1;
    channel_maxfamilyclients: number = -1;

    channel_needed_talk_power: number = 0;

    channel_flag_permanent: boolean = false;
    channel_flag_semi_permanent: boolean = false;
    channel_flag_default: boolean = false;
    channel_flag_password: boolean = false;
    channel_flag_maxclients_unlimited: boolean = false;
    channel_flag_maxfamilyclients_inherited: boolean = false;
    channel_flag_maxfamilyclients_unlimited: boolean = false;

    channel_icon_id: number = 0;
    channel_delete_delay: number = 0;

    //Only after request
    channel_description: string = "";

    channel_flag_conversation_private: boolean = true; /* TeamSpeak mode */
    channel_conversation_history_length: number = -1;
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

    notify_children_changed: {},
    notify_clients_changed: {}, /* will also be fired when clients haven been reordered */
}

export class ParsedChannelName {
    readonly original_name: string;
    alignment: "center" | "right" | "left" | "normal";
    repetitive: boolean;
    text: string; /* does not contain any alignment codes */

    constructor(name: string, has_parent_channel: boolean) {
        this.original_name = name;
        this.parse(has_parent_channel);
    }

    private parse(has_parent_channel: boolean) {
        this.alignment = "normal";

        parse_type:
        if(!has_parent_channel && this.original_name.charAt(0) == '[') {
            let end = this.original_name.indexOf(']');
            if(end === -1) break parse_type;

            let options = this.original_name.substr(1, end - 1);
            if(options.indexOf("spacer") === -1) break parse_type;
            options = options.substr(0, options.indexOf("spacer"));

            if(options.length == 0)
                options = "l";
            else if(options.length > 1)
                options = options[0];

            switch (options) {
                case "r":
                    this.alignment = "right";
                    break;
                case "l":
                    this.alignment = "center";
                    break;
                case "c":
                    this.alignment = "center";
                    break;
                case "*":
                    this.alignment = "center";
                    this.repetitive = true;
                    break;
                default:
                    break parse_type;
            }

            this.text = this.original_name.substr(end + 1);
        }
        if(!this.text && this.alignment === "normal")
            this.text = this.original_name;
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
    readonly view: React.RefObject<ChannelEntryView>;

    parsed_channel_name: ParsedChannelName;

    private _family_index: number = 0;

    //HTML DOM elements
    private _destroyed = false;

    private cachedPasswordHash: string;
    private _cached_channel_description: string = undefined;
    private _cached_channel_description_promise: Promise<string> = undefined;
    private _cached_channel_description_promise_resolve: any = undefined;
    private _cached_channel_description_promise_reject: any = undefined;

    private _flag_collapsed: boolean;
    private _flag_subscribed: boolean;
    private _subscribe_mode: ChannelSubscribeMode;

    private client_list: ClientEntry[] = []; /* this list is sorted correctly! */
    private readonly client_property_listener;

    constructor(channelId, channelName) {
        super();

        this.events = new Registry<ChannelEvents>();
        this.view = React.createRef<ChannelEntryView>();
        
        this.properties = new ChannelProperties();
        this.channelId = channelId;
        this.properties.channel_name = channelName;
        this.channelTree = null;

        this.parsed_channel_name = new ParsedChannelName("undefined", false);

        this.client_property_listener = (event: ClientEvents["notify_properties_updated"]) => {
            if(typeof event.updated_properties.client_nickname !== "undefined" || typeof event.updated_properties.client_talk_power !== "undefined")
                this.reorderClientList(true);
        };

        this.events.on("notify_properties_updated", event => {
            this.channelTree?.events.fire("notify_channel_updated", {
                channel: this,
                channelProperties: event.channel_properties,
                updatedProperties: event.updated_properties
            });
        });
    }

    destroy() {
        this._destroyed = true;

        this.client_list.forEach(e => this.unregisterClient(e, true));
        this.client_list = [];

        this._cached_channel_description_promise = undefined;
        this._cached_channel_description_promise_resolve = undefined;
        this._cached_channel_description_promise_reject = undefined;

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

    getChannelDescription() : Promise<string> {
        if(this._cached_channel_description) return new Promise<string>(resolve => resolve(this._cached_channel_description));
        if(this._cached_channel_description_promise) return this._cached_channel_description_promise;

        this.channelTree.client.serverConnection.send_command("channelgetdescription", {cid: this.channelId}).catch(error => {
            this._cached_channel_description_promise_reject(error);
        });

        return this._cached_channel_description_promise = new Promise<string>((resolve, reject) => {
            this._cached_channel_description_promise_resolve = resolve;
            this._cached_channel_description_promise_reject = reject;
        });
    }

    registerClient(client: ClientEntry) {
        client.events.on("notify_properties_updated", this.client_property_listener);
        this.client_list.push(client);
        this.reorderClientList(false);

        this.events.fire("notify_clients_changed");
    }

    unregisterClient(client: ClientEntry, no_event?: boolean) {
        client.events.off("notify_properties_updated", this.client_property_listener);
        if(!this.client_list.remove(client))
            log.warn(LogCategory.CHANNEL, tr("Unregistered unknown client from channel %s"), this.channelName());

        if(!no_event)
            this.events.fire("notify_clients_changed");
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
                    this.events.fire("notify_clients_changed");
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

    clients_ordered() : ClientEntry[] {
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

    protected onSelect(singleSelect: boolean) {
        super.onSelect(singleSelect);
        if(!singleSelect) return;

        if(settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)) {
            this.channelTree.client.side_bar.channel_conversations().setSelectedConversation(this.channelId);
            this.channelTree.client.side_bar.show_channel_conversations();
        }
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
            },{
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-filetransfer",
                name: bold(tr("Open channel file browser")),
                callback: () => spawnFileTransferModal(this.getChannelId()),
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_switch",
                name: bold(tr("Join text channel")),
                callback: () => {
                    this.channelTree.client.side_bar.channel_conversations().setSelectedConversation(this.getChannelId());
                    this.channelTree.client.side_bar.show_channel_conversations();
                },
                visible: !settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)
            }, {
                type: contextmenu.MenuEntryType.HR,
                name: ''
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Show channel info"),
                callback: () => {
                    trigger_close = false;
                    openChannelInfo(this);
                },
                icon_class: "client-about"
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
                            visible: !this.flag_subscribed
                        },
                        {
                            type: contextmenu.MenuEntryType.ENTRY,
                            icon: "client-channel_unsubscribed",
                            name: bold(tr("Unsubscribe from channel")),
                            callback: () => this.unsubscribe(),
                            visible: this.flag_subscribed
                        },
                        {
                            type: contextmenu.MenuEntryType.ENTRY,
                            icon: "client-subscribe_mode",
                            name: bold(tr("Use inherited subscribe mode")),
                            callback: () => this.unsubscribe(true),
                            visible: this.subscribe_mode != ChannelSubscribeMode.INHERITED
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
                    createChannelModal(this.channelTree.client, this, this.parent, this.channelTree.client.permissions, (changes?, permissions?) => {
                        if(changes) {
                            changes["cid"] = this.channelId;
                            this.channelTree.client.serverConnection.send_command("channeledit", changes);
                            log.info(LogCategory.CHANNEL, tr("Changed channel properties of channel %s: %o"), this.channelName(), changes);
                        }

                        if(permissions && permissions.length > 0) {
                            let perms = [];
                            for(let perm of permissions) {
                                perms.push({
                                    permvalue: perm.value,
                                    permnegated: false,
                                    permskip: false,
                                    permid: perm.type.id
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
                    const client = this.channelTree.client;
                    this.channelTree.client.serverConnection.send_command("channeldelete", {cid: this.channelId}).then(() => {
                        client.sound.play(Sound.CHANNEL_DELETED);
                    });
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
        /* devel-block(log-channel-property-updates) */
        let group = log.group(log.LogType.DEBUG, LogCategory.CHANNEL_PROPERTIES, tr("Update properties (%i) of %s (%i)"), variables.length, this.channelName(), this.getChannelId());

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
        /* devel-block-end */

        let info_update = false;
        for(let variable of variables) {
            let key = variable.key;
            let value = variable.value;
            JSON.map_field_to(this.properties, value, variable.key);

            if(key == "channel_name") {
                this.parsed_channel_name = new ParsedChannelName(value, this.hasParent());
                info_update = true;
            } else if(key == "channel_order") {
                let order = this.channelTree.findChannel(this.properties.channel_order);
                this.channelTree.moveChannel(this, order, this.parent);
            } else if(key === "channel_icon_id") {
                this.properties.channel_icon_id = variable.value as any >>> 0; /* unsigned 32 bit number! */
            } else if(key == "channel_description") {
                this._cached_channel_description = undefined;
                if(this._cached_channel_description_promise_resolve)
                    this._cached_channel_description_promise_resolve(value);
                this._cached_channel_description_promise = undefined;
                this._cached_channel_description_promise_resolve = undefined;
                this._cached_channel_description_promise_reject = undefined;
            }
        }
        /* devel-block(log-channel-property-updates) */
        group.end();
        /* devel-block-end */
        {
            let properties = {};
            for(const property of variables)
                properties[property.key] = this.properties[property.key];
            this.events.fire("notify_properties_updated", { updated_properties: properties as any, channel_properties: this.properties });
        }

        if(info_update) {
            const _client = this.channelTree.client.getClient();
            if(_client.currentChannel() === this)
                this.channelTree.client.side_bar.info_frame().update_channel_talk();
            //TODO chat channel!
        }
    }

    generate_bbcode() {
        return "[url=channel://" + this.channelId + "/" + encodeURIComponent(this.properties.channel_name) + "]" + this.formattedChannelName() + "[/url]";
    }

    generate_tag(braces: boolean = false) : JQuery {
        return $(htmltags.generate_channel({
            channel_name: this.properties.channel_name,
            channel_id: this.channelId,
            add_braces: braces
        }));
    }

    channelType() : ChannelType {
        if(this.properties.channel_flag_permanent == true) return ChannelType.PERMANENT;
        if(this.properties.channel_flag_semi_permanent == true) return ChannelType.SEMI_PERMANENT;
        return ChannelType.TEMPORARY;
    }

    joinChannel(ignorePasswordFlag?: boolean) {
        if(this.channelTree.client.getClient().currentChannel() === this)
            return;

        if(this.properties.channel_flag_password === true && !this.cachedPasswordHash && !ignorePasswordFlag) {
            this.requestChannelPassword(PermissionType.B_CHANNEL_JOIN_IGNORE_PASSWORD).then(() => {
                this.joinChannel(true);
            });
            return;
        }

        this.channelTree.client.getServerConnection().command_helper.joinChannel(this, this.cachedPasswordHash).then(() => {
            this.channelTree.client.sound.play(Sound.CHANNEL_JOINED);
        }).catch(error => {
            if(error instanceof CommandResult) {
                if(error.id == 781) { //Invalid password
                    this.invalidateCachedPassword();
                }
            }
        });
    }

    async requestChannelPassword(ignorePermission: PermissionType) : Promise<{ hash: string } | undefined> {
        if(this.cachedPasswordHash)
            return { hash: this.cachedPasswordHash };

        if(this.channelTree.client.permissions.neededPermission(ignorePermission).granted(1))
            return { hash: "having ignore permission" };

        const password = await new Promise(resolve => createInputModal(tr("Channel password"), tr("Channel password:"), () => true, resolve).open())
        if(typeof(password) !== "string" || !password)
            return;

        const hash = await hashPassword(password);
        this.cachedPasswordHash = hash;
        this.events.fire("notify_cached_password_updated", { reason: "password-entered", new_hash: hash });
        return { hash: this.cachedPasswordHash };
    }

    invalidateCachedPassword() {
        this.cachedPasswordHash = undefined;
        this.events.fire("notify_cached_password_updated", { reason: "password-miss-match" });
    }

    cached_password() { return this.cachedPasswordHash; }

    async subscribe() : Promise<void> {
        if(this.subscribe_mode == ChannelSubscribeMode.SUBSCRIBED)
            return;

        this.subscribe_mode = ChannelSubscribeMode.SUBSCRIBED;

        const connection = this.channelTree.client.getServerConnection();
        if(!this.flag_subscribed && connection)
            await connection.send_command('channelsubscribe', {
                'cid': this.getChannelId()
            });
        else
            this.flag_subscribed = false;
    }

    async unsubscribe(inherited_subscription_mode?: boolean) : Promise<void> {
        const connection = this.channelTree.client.getServerConnection();
        let unsubscribe: boolean;

        if(inherited_subscription_mode) {
            this.subscribe_mode = ChannelSubscribeMode.INHERITED;
            unsubscribe = this.flag_subscribed && !this.channelTree.client.isSubscribeToAllChannels();
        } else {
            this.subscribe_mode = ChannelSubscribeMode.UNSUBSCRIBED;
            unsubscribe = this.flag_subscribed;
        }

        if(unsubscribe) {
            if(connection)
                await connection.send_command('channelunsubscribe', {
                    'cid': this.getChannelId()
                });
            else
                this.flag_subscribed = false;

            for(const client of this.clients(false))
                this.channelTree.deleteClient(client, { serverLeave: false, reason: ViewReasonId.VREASON_SYSTEM });
        }
    }

    get collapsed() : boolean {
        if(typeof this._flag_collapsed === "undefined")
            this._flag_collapsed = this.channelTree.client.settings.server(Settings.FN_SERVER_CHANNEL_COLLAPSED(this.channelId));
        return this._flag_collapsed;
    }

    set collapsed(flag: boolean) {
        if(this._flag_collapsed === flag)
            return;
        this._flag_collapsed = flag;
        this.events.fire("notify_collapsed_state_changed", { collapsed: flag });
        this.view.current?.forceUpdate();
        this.channelTree.client.settings.changeServer(Settings.FN_SERVER_CHANNEL_COLLAPSED(this.channelId), flag);
    }

    get flag_subscribed() : boolean {
        return this._flag_subscribed;
    }

    set flag_subscribed(flag: boolean) {
        if(this._flag_subscribed == flag)
            return;

        this._flag_subscribed = flag;
        this.events.fire("notify_subscribe_state_changed", { channel_subscribed: flag });
    }

    get subscribe_mode() : ChannelSubscribeMode {
        return typeof(this._subscribe_mode) !== 'undefined' ? this._subscribe_mode : (this._subscribe_mode = this.channelTree.client.settings.server(Settings.FN_SERVER_CHANNEL_SUBSCRIBE_MODE(this.channelId), ChannelSubscribeMode.INHERITED));
    }

    set subscribe_mode(mode: ChannelSubscribeMode) {
        if(this.subscribe_mode == mode)
            return;

        this._subscribe_mode = mode;
        this.channelTree.client.settings.changeServer(Settings.FN_SERVER_CHANNEL_SUBSCRIBE_MODE(this.channelId), mode);
    }

    log_data() : EventChannelData {
        return {
            channel_name: this.channelName(),
            channel_id: this.channelId
        }
    }
}