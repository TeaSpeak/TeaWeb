import {GroupManager} from "../../../permission/GroupManager";
import {Frame, FrameContent} from "../../../ui/frames/chat_frame";
import {openClientInfo} from "../../../ui/modal/ModalClientInfo";
import * as htmltags from "../../../ui/htmltags";
import * as image_preview from "../image_preview";
import * as i18nc from "../../../i18n/country";
import {ClientEntry, LocalClientEntry} from "../../../tree/Client";
import {format_online_time} from "../../../utils/TimeUtils";
import {generateIconJQueryTag, getIconManager} from "tc-shared/file/Icons";
import { tr } from "tc-shared/i18n/localize";

export class ClientInfo {
    readonly handle: Frame;
    private _html_tag: JQuery;
    private _current_client: ClientEntry | undefined;
    private _online_time_updater: number;
    previous_frame_content: FrameContent;

    constructor(handle: Frame) {
        this.handle = handle;
        this._build_html_tag();
    }

    html_tag() : JQuery {
        return this._html_tag;
    }

    destroy() {
        clearInterval(this._online_time_updater);

        this._html_tag && this._html_tag.remove();
        this._html_tag = undefined;

        this._current_client = undefined;
        this.previous_frame_content = undefined;
    }

    private _build_html_tag() {
        this._html_tag = $("#tmpl_frame_chat_client_info").renderTag();
        this._html_tag.find(".button-close").on('click', () => {
            if(this.previous_frame_content === FrameContent.CLIENT_INFO)
                this.previous_frame_content = FrameContent.NONE;

            this.handle.set_content(this.previous_frame_content);
        });
        this._html_tag.find(".button-more").on('click', () => {
            if(!this._current_client)
                return;

            openClientInfo(this._current_client);
        });
        this._html_tag.find('.container-avatar-edit').on('click', () => this.handle.handle.update_avatar());
    }

    current_client() : ClientEntry {
        return this._current_client;
    }

    set_current_client(client: ClientEntry | undefined, enforce?: boolean) {
        if(client) client.updateClientVariables(); /* just to ensure */
        if(client === this._current_client && (typeof(enforce) === "undefined" || !enforce))
            return;

        this._current_client = client;

        /* updating the header */
        {
            const client_name = this._html_tag.find(".client-name");
            client_name.children().remove();
            htmltags.generate_client_object({
                add_braces: false,
                client_name: client ? client.clientNickName() : "undefined",
                client_unique_id: client ? client.clientUid() : "",
                client_id: client ? client.clientId() : 0
            }).appendTo(client_name);

            const client_description = this._html_tag.find(".client-description");
            client_description.text(client ? client.properties.client_description : "").toggle(!!client.properties.client_description);

            const is_local_entry = client instanceof LocalClientEntry;
            const container_avatar = this._html_tag.find(".container-avatar");
            container_avatar.find(".avatar").remove();
            if(client) {
                const avatar = this.handle.handle.fileManager.avatars.generate_chat_tag({id: client.clientId()}, client.clientUid());
                if(!is_local_entry) {
                    avatar.css("cursor", "pointer").on('click', event => {
                        image_preview.preview_image_tag(this.handle.handle.fileManager.avatars.generate_chat_tag({id: client.clientId()}, client.clientUid()));
                    });
                }
                avatar.appendTo(container_avatar);
            } else
                this.handle.handle.fileManager.avatars.generate_chat_tag(undefined, undefined).appendTo(container_avatar);

            container_avatar.toggleClass("editable", is_local_entry);
        }
        /* updating the info fields */
        {
            const online_time = this._html_tag.find(".client-online-time");
            online_time.text(format_online_time(client ? client.calculateOnlineTime() : 0));
            if(this._online_time_updater) {
                clearInterval(this._online_time_updater);
                this._online_time_updater = 0;
            }
            if(client) {
                this._online_time_updater = setInterval(() => {
                    const client = this._current_client;
                    if(!client) {
                        clearInterval(this._online_time_updater);
                        this._online_time_updater = undefined;
                        return;
                    }

                    if(client.currentChannel()) /* If he has no channel then he might be disconnected */
                        online_time.text(format_online_time(client.calculateOnlineTime()));
                    else {
                        online_time.text(online_time.text() + tr(" (left view)"));
                        clearInterval(this._online_time_updater);
                    }
                }, 1000);
            }

            const country = this._html_tag.find(".client-country");
            country.children().detach();
            const country_code = (client ? client.properties.client_country : undefined) || "xx";
            $.spawn("div").addClass("country flag-" + country_code.toLowerCase()).appendTo(country);
            $.spawn("a").text(i18nc.country_name(country_code.toUpperCase())).appendTo(country);


            const version = this._html_tag.find(".client-version");
            version.children().detach();
            if(client) {
                let platform = client.properties.client_platform;
                if(platform.indexOf("Win32") != 0 && (client.properties.client_version.indexOf("Win64") != -1 || client.properties.client_version.indexOf("WOW64") != -1))
                    platform = platform.replace("Win32", "Win64");
                $.spawn("a").attr("title", client.properties.client_version).text(
                    client.properties.client_version.split(" ")[0] + " on " + platform
                ).appendTo(version);
            }

            const volume = this._html_tag.find(".client-local-volume");
            volume.text((client && client.getVoiceClient() ? (client.getVoiceClient().getVolume() * 100) : -1).toFixed(0) + "%");
        }

        /* teaspeak forum */
        {
            const container_forum = this._html_tag.find(".container-teaforo");
            if(client && client.properties.client_teaforo_id) {
                container_forum.show();

                const container_data = container_forum.find(".client-teaforo-account");
                container_data.children().remove();

                let text = client.properties.client_teaforo_name;
                if((client.properties.client_teaforo_flags & 0x01) > 0)
                    text += " (" + tr("Banned") + ")";
                if((client.properties.client_teaforo_flags & 0x02) > 0)
                    text += " (" + tr("Stuff") + ")";
                if((client.properties.client_teaforo_flags & 0x04) > 0)
                    text += " (" + tr("Premium") + ")";

                $.spawn("a")
                    .attr("href", "https://forum.teaspeak.de/index.php?members/" + client.properties.client_teaforo_id)
                    .attr("target", "_blank")
                    .text(text)
                    .appendTo(container_data);
            } else {
                container_forum.hide();
            }
        }

        /* update the client status */
        {
            //TODO Implement client status!
            const container_status = this._html_tag.find(".container-client-status");
            const container_status_entries = container_status.find(".client-status");
            container_status_entries.children().detach();
            if(client) {
                if(client.properties.client_away) {
                    container_status_entries.append(
                        $.spawn("div").addClass("status-entry").append(
                            $.spawn("div").addClass("icon_em client-away"),
                            $.spawn("a").text(tr("Away")),
                            client.properties.client_away_message ?
                                $.spawn("a").addClass("away-message").text("(" + client.properties.client_away_message + ")") :
                                undefined
                        )
                    )
                }
                if(client.isMuted()) {
                    container_status_entries.append(
                        $.spawn("div").addClass("status-entry").append(
                            $.spawn("div").addClass("icon_em client-input_muted_local"),
                            $.spawn("a").text(tr("Client local muted"))
                        )
                    )
                }
                if(!client.properties.client_output_hardware) {
                    container_status_entries.append(
                        $.spawn("div").addClass("status-entry").append(
                            $.spawn("div").addClass("icon_em client-hardware_output_muted"),
                            $.spawn("a").text(tr("Speakers/Headphones disabled"))
                        )
                    )
                }
                if(!client.properties.client_input_hardware) {
                    container_status_entries.append(
                        $.spawn("div").addClass("status-entry").append(
                            $.spawn("div").addClass("icon_em client-hardware_input_muted"),
                            $.spawn("a").text(tr("Microphone disabled"))
                        )
                    )
                }
                if(client.properties.client_output_muted) {
                    container_status_entries.append(
                        $.spawn("div").addClass("status-entry").append(
                            $.spawn("div").addClass("icon_em client-output_muted"),
                            $.spawn("a").text(tr("Speakers/Headphones Muted"))
                        )
                    )
                }
                if(client.properties.client_input_muted) {
                    container_status_entries.append(
                        $.spawn("div").addClass("status-entry").append(
                            $.spawn("div").addClass("icon_em client-input_muted"),
                            $.spawn("a").text(tr("Microphone Muted"))
                        )
                    )
                }
            }
            container_status.toggle(container_status_entries.children().length > 0);
        }
        /* update client server groups */
        {
            const container_groups = this._html_tag.find(".client-group-server");
            container_groups.children().detach();
            if(client) {
                const invalid_groups = [];
                const groups = client.assignedServerGroupIds().map(group_id => {
                    const result = this.handle.handle.groups.findServerGroup(group_id);
                    if(!result)
                        invalid_groups.push(group_id);
                    return result;
                }).filter(e => !!e).sort(GroupManager.sorter());
                for(const invalid_id of invalid_groups) {
                    container_groups.append($.spawn("a").text("{" + tr("server group ") + invalid_groups + "}").attr("title", tr("Missing server group id!") + " (" + invalid_groups + ")"));
                }
                for(let group of groups) {
                    container_groups.append(
                        $.spawn("div").addClass("group-container")
                            .append(
                                generateIconJQueryTag(getIconManager().resolveIcon(group.properties.iconid, this.handle.handle.getCurrentServerUniqueId(), this.handle.handle.handlerId))
                            ).append(
                            $.spawn("a").text(group.name).attr("title", tr("Group id: ") + group.id)
                        )
                    );
                }
            }
        }
        /* update client channel group */
        {
            const container_group =  this._html_tag.find(".client-group-channel");
            container_group.children().detach();
            if(client) {
                const group_id = client.assignedChannelGroup();
                let group = this.handle.handle.groups.findChannelGroup(group_id);
                if(group) {
                    container_group.append(
                        $.spawn("div").addClass("group-container")
                            .append(
                                generateIconJQueryTag(getIconManager().resolveIcon(group.properties.iconid, this.handle.handle.getCurrentServerUniqueId(), this.handle.handle.handlerId))
                            ).append(
                            $.spawn("a").text(group.name).attr("title", tr("Group id: ") + group_id)
                        )
                    );
                } else {
                    container_group.append($.spawn("a").text(tr("Invalid channel group!")).attr("title", tr("Missing channel group id!") + " (" + group_id + ")"));
                }
            }
        }
    }
}