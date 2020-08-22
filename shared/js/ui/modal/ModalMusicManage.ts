import {createErrorModal, createModal} from "tc-shared/ui/elements/Modal";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {MusicClientEntry} from "tc-shared/ui/client";
import {Registry} from "tc-shared/events";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {LogCategory} from "tc-shared/log";
import * as log from "tc-shared/log";
import {tra} from "tc-shared/i18n/localize";
import * as tooltip from "tc-shared/ui/elements/Tooltip";
import { modal } from "tc-shared/events";
import * as i18nc from "tc-shared/i18n/country";
import {find} from "tc-shared/permission/PermissionManager";
import ServerGroup = find.ServerGroup;
import * as htmltags from "tc-shared/ui/htmltags";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

export function openMusicManage(client: ConnectionHandler, bot: MusicClientEntry) {
    const ev_registry = new Registry<modal.music_manage>();
    ev_registry.enableDebug("music-manage");
    //dummy_controller(ev_registry);
    permission_controller(ev_registry, bot, client);

    let modal = createModal({
        header: tr(tr("Playlist Manage")),
        body:  () => build_modal(ev_registry),
        footer: null,

        min_width: "35em",
        closeable: true
    });
    modal.htmlTag.find(".modal-body").addClass("modal-music-manage");

    /* "controller" */
    {

    }

    modal.open();
}

function permission_controller(event_registry: Registry<modal.music_manage>, bot: MusicClientEntry, client: ConnectionHandler) {
    const error_msg = error => {
        if(error instanceof CommandResult) {
            if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                const permission = client.permissions.resolveInfo(error.json["failed_permid"]);
                return tr("failed on permission ") + (permission ? permission.name : tr("unknown"));
            }
            return error.extra_message || error.message;
        } else if(typeof error === "string")
            return error;
        else
            return tr("command error");
    };

    {
        event_registry.on("query_playlist_status", event => {
            const playlist_id = bot.properties.client_playlist_id;
            client.serverConnection.command_helper.request_playlist_info(playlist_id).then(result => {
                event_registry.fire("playlist_status", {
                    status: "success",
                    data: {
                        replay_mode: result.playlist_replay_mode,
                        finished: result.playlist_flag_finished,
                        delete_played: result.playlist_flag_delete_played,
                        notify_song_change: bot.properties.client_flag_notify_song_change,
                        max_size: result.playlist_max_songs
                    }
                });
            }).catch(error => {
                event_registry.fire("playlist_status", {
                    status: "error",
                    error_msg: error_msg(error)
                });
                log.error(LogCategory.CLIENT, tr("Failed to query playlist info for playlist %d: %o"), playlist_id, error);
            });
        });

        event_registry.on("set_playlist_status", event => {
            const playlist_id = bot.properties.client_playlist_id;
            const property_map = {
                "replay_mode": "playlist_replay_mode",
                "finished": "playlist_flag_finished",
                "delete_played": "playlist_flag_delete_played",
                "max_size": "playlist_max_songs"
            };

            Promise.resolve().then(() => {
                if(event.key === "notify_song_change") {
                    return client.serverConnection.send_command("clientedit", {
                        clid: bot.clientId(),
                        client_flag_notify_song_change: event.value
                    });
                } else {
                    const property = property_map[event.key];
                    if(!property) return Promise.reject(tr("unknown property"));

                    const data = {
                        playlist_id: playlist_id
                    };
                    data[property] = event.value;
                    return client.serverConnection.send_command("playlistedit", data);
                }
            }).then(() => {
                event_registry.fire("set_playlist_status_result", {
                    status: "success",
                    key: event.key,
                    value: event.value
                });
            }).catch(error => {
                event_registry.fire("set_playlist_status_result", {
                    status: "error",
                    key: event.key,
                    error_msg: error_msg(error)
                });
                log.error(LogCategory.CLIENT, tr("Failed to change playlist status %s for playlist %d: %o"), event.key, playlist_id, error);
            });
        });

        event_registry.on("query_bot_status", event => {
            setTimeout(() => {
                event_registry.fire("bot_status", {
                    status: "success",
                    data: {
                        channel_commander: bot.properties.client_is_channel_commander,
                        volume: bot.properties.player_volume,
                        description: bot.properties.client_description,
                        default_country_code: (
                            !bot.channelTree ? undefined :
                                !bot.channelTree.server ? undefined : bot.channelTree.server.properties.virtualserver_country_code) || "DE",
                        country_code: bot.properties.client_country,
                        name: bot.properties.client_nickname,
                        priority_speaker: bot.properties.client_is_priority_speaker,

                        bot_type: bot.properties.client_bot_type,
                        client_platform: bot.properties.client_platform,
                        client_version: bot.properties.client_version,
                        uptime_mode: bot.properties.client_uptime_mode
                    }
                });
            }, 0);
        });

        event_registry.on("set_bot_status", event => {
            const property_map = {
                "channel_commander": "client_is_channel_commander",
                "volume": "player_volume",
                "description": "client_description",
                "country_code": "client_country",
                "name": "client_nickname",
                "priority_speaker": "client_is_priority_speaker",

                "bot_type": "client_bot_type",
                "client_platform": "client_platform",
                "client_version": "client_version",
                "uptime_mode": "client_uptime_mode"
            };


            Promise.resolve().then(() => {
                const property = property_map[event.key];
                if(!property) return Promise.reject(tr("unknown property"));

                const data = {
                    clid: bot.clientId()
                };
                data[property] = event.value;
                return client.serverConnection.send_command("clientedit", data);
            }).then(() => {
                event_registry.fire("set_bot_status_result", {
                    status: "success",
                    key: event.key,
                    value: event.value
                });
            }).catch(error => {
                event_registry.fire("set_bot_status_result", {
                    status: "error",
                    key: event.key,
                    error_msg: error_msg(error)
                });
                log.error(LogCategory.CLIENT, tr("Failed to change bot setting %s: %o"), event.key, error);
            });
        });
    }

    /* permissions */
    {
        event_registry.on("query_general_permissions", event => {
            const playlist_id = bot.properties.client_playlist_id;
            client.permissions.requestPlaylistPermissions(playlist_id).then(result => {
                const permissions = {};
                for(const permission of result)
                    if(permission.hasValue())
                        permissions[permission.type.name] = permission.value;
                event_registry.fire("general_permissions", {
                    status: "success",
                    permissions: permissions
                });
            }).catch(error => {
                event_registry.fire("general_permissions", {
                    status: "error",
                    error_msg: error_msg(error)
                });
                log.error(LogCategory.CLIENT, tr("Failed to query playlist general permissions for playlist %d: %o"), playlist_id, error);
            });
        });

        event_registry.on("set_general_permission", event => {
            const playlist_id = bot.properties.client_playlist_id;

            client.serverConnection.send_command("playlistaddperm", {
                playlist_id: playlist_id,
                permsid: event.key,
                permvalue: event.value,
                permskip: false,
                permnegated: false
            }).then(() => {
                event_registry.fire("set_general_permission_result", {
                    key: event.key,
                    status: "success",
                    value: event.value
                });
            }).catch(error => {
                event_registry.fire("set_general_permission_result", {
                    status: "error",
                    key: event.key,
                    error_msg: error_msg(error)
                });
                log.error(LogCategory.CLIENT, tr("Failed to set playlist general permissions for playlist %d and permission %d: %o"), playlist_id, event.key, error);
            });
        });

        event_registry.on("query_client_permissions", event => {
            const playlist_id = bot.properties.client_playlist_id;
            const client_id = event.client_database_id;
            client.permissions.requestPlaylistClientPermissions(playlist_id, client_id).then(result => {
                const permissions = {};
                for(const permission of result)
                    if(permission.hasValue())
                        permissions[permission.type.name] = permission.value;
                event_registry.fire("client_permissions", {
                    status: "success",
                    client_database_id: event.client_database_id,
                    permissions: permissions
                });
            }).catch(error => {
                event_registry.fire("client_permissions", {
                    status: "error",
                    client_database_id: event.client_database_id,
                    error_msg: error_msg(error)
                });
                log.error(LogCategory.CLIENT, tr("Failed to query playlist client permissions for playlist %d and client %d: %o"), playlist_id, client_id, error);
            });
        });

        event_registry.on("set_client_permission", event => {
            const playlist_id = bot.properties.client_playlist_id;
            const client_id = event.client_database_id;

            client.serverConnection.send_command("playlistclientaddperm", {
                playlist_id: playlist_id,
                cldbid: client_id,

                permsid: event.key,
                permvalue: event.value,
                permskip: false,
                permnegated: false
            }).then(() => {
                event_registry.fire("set_client_permission_result", {
                    key: event.key,
                    status: "success",
                    client_database_id: client_id,
                    value: event.value
                });
            }).catch(error => {
                event_registry.fire("set_client_permission_result", {
                    status: "error",
                    key: event.key,
                    client_database_id: client_id,
                    error_msg: error_msg(error)
                });
                log.error(LogCategory.CLIENT, tr("Failed to set playlist client permissions for playlist %d, permission %d and client id %d: %o"), playlist_id, event.key, client_id, error);
            });
        });

        event_registry.on("query_special_clients", event => {
            const playlist_id = bot.properties.client_playlist_id;
            client.serverConnection.command_helper.request_playlist_client_list(playlist_id).then(clients => {
                return client.serverConnection.command_helper.info_from_cldbid(...clients);
            }).then(clients => {
                event_registry.fire("special_client_list", {
                    status: "success",
                    clients: clients.map(e => {
                        return {
                            name: e.client_nickname,
                            unique_id: e.client_unique_id,
                            database_id: e.client_database_id
                        }
                    })
                });
            }).catch(error => {
                event_registry.fire("special_client_list", {
                    status: "error",
                    error_msg: error_msg(error)
                });
                log.error(LogCategory.CLIENT, tr("Failed to query special client list for playlist %d: %o"), playlist_id, error);
            })
        });

        event_registry.on("search_client", event => {
            if(!event.text) return;

            const text = event.text;
            Promise.resolve().then(() => {
                let is_uuid = false;
                try {
                    is_uuid = atob(text).length === 32;
                } catch(e) {}
                if(is_uuid) {
                    return client.serverConnection.command_helper.info_from_uid(text);
                } else if(text.match(/^[0-9]{1,7}$/) && !isNaN(parseInt(text))) {
                    return client.serverConnection.command_helper.info_from_cldbid(parseInt(text));
                } else {
                    //TODO: Database name lookup?
                    return Promise.reject("no results");
                }
            }).then(result => {
                if(result.length) {
                    const client = result[0];
                    event_registry.fire("search_client_result", {
                        status: "success",
                        client: {
                            name: client.client_nickname,
                            unique_id: client.client_unique_id,
                            database_id: client.client_database_id
                        }
                    });
                } else {
                    event_registry.fire("search_client_result", {
                        status: "empty"
                    });
                }
            }).catch(error => {
                event_registry.fire("search_client_result", {
                    status: "error",
                    error_msg: error_msg(error)
                });
                log.error(LogCategory.CLIENT, tr("Failed to lookup search text \"%s\": %o"), text, error);
            });
        });

        event_registry.on("query_group_permissions", event => {
            client.permissions.find_permission(event.permission_name).then(result => {
                let groups = [];
                for(const e of result) {
                    if(e.type !== "server_group") continue;

                    const group = client.groups.findServerGroup((e as ServerGroup).group_id);
                    if(!group) continue;

                    groups.push({
                        name: group.name,
                        value: e.value,
                        id: group.id
                    });
                }

                event_registry.fire("group_permissions", {
                    status: "success",
                    groups: groups,
                    permission_name: event.permission_name
                });
            }).catch(error => {
                event_registry.fire("group_permissions", {
                    status: "error",
                    error_msg: error_msg(error),
                    permission_name: event.permission_name
                });
                log.error(LogCategory.CLIENT, tr("Failed to execute permfind for permission %s: %o"), event.permission_name, error);
            });
        });
    }
}

function dummy_controller(event_registry: Registry<modal.music_manage>) {
    /* settings */
    {
        event_registry.on("query_bot_status", event => {
            setTimeout(() => {
                event_registry.fire("bot_status", {
                    status: "success",
                    data: {
                        name: "Another TeaSpeak bot",
                        country_code: "DE",
                        default_country_code: "GB",
                        channel_commander: false,
                        description: "Hello World",
                        priority_speaker: true,
                        volume: 66,

                        uptime_mode: 0,
                        client_version: "Version",
                        client_platform: "Platform",
                        bot_type: 0
                    }
                })
            });
        });


        event_registry.on("query_playlist_status", event => {
            setTimeout(() => {
                event_registry.fire("playlist_status", {
                    status: "success",
                    data: {
                        max_size: 55,
                        notify_song_change: true,
                        delete_played: false,
                        finished: false,
                        replay_mode: 2
                    }
                })
            });
        });
    }

    /* permissions */
    {
        event_registry.on("query_special_clients", event => {
            setTimeout(() => {
                event_registry.fire("special_client_list", {
                    status: "success",
                    clients: [{
                        name: "WolverinDEV",
                        database_id: 1,
                        unique_id: "abd"
                    }, {
                        name: "WolverinDEV 2",
                        database_id: 2,
                        unique_id: "abd1"
                    }, {
                        name: "WolverinDEV 3",
                        database_id: 3,
                        unique_id: "abd1"
                    }]
                });
            }, 0);
        });

        event_registry.on("query_group_permissions", event => {
            setTimeout(() => {
                event_registry.fire("group_permissions", {
                    status: "success",
                    groups: [{
                        value: 20,
                        name: "Server Admin p:20",
                        id: 0
                    }, {
                        value: 10,
                        name: "Server Mod p:10",
                        id: 0
                    }],
                    permission_name: event.permission_name
                });
            }, 0);
        });

        event_registry.on("query_general_permissions", event => {
            setTimeout(() => {
                event_registry.fire("general_permissions", {
                    status: "success",
                    permissions: {
                        i_playlist_song_needed_add_power: 77
                    }
                })
            }, 0);
        });

        event_registry.on("set_general_permission", event => {
            setTimeout(() => {
                event_registry.fire("set_general_permission_result", {
                    key: event.key,
                    value: event.value,
                    status: "success"
                });
            });
        });

        event_registry.on("query_client_permissions", event => {
            setTimeout(() => {
                event_registry.fire("client_permissions", {
                    client_database_id: event.client_database_id,
                    status: "success",
                    permissions: {
                        i_playlist_song_needed_add_power: 77
                    }
                })
            }, 500);
        });

        event_registry.on("set_client_permission", event => {
            setTimeout(() => {
                event_registry.fire("set_client_permission_result", {
                    key: event.key,
                    client_database_id: event.client_database_id,
                    status: "success",
                    value: event.value
                })
            }, 500);
        });
    }
}


function build_modal(event_registry: Registry<modal.music_manage>) : JQuery<HTMLElement> {
    const tag = $("#tmpl_music_manage").renderTag();

    const container_settings = tag.find(".body > .category-settings");
    build_settings_container(event_registry, container_settings);

    const container_permissions = tag.find(".body > .category-permissions");
    build_permission_container(event_registry, container_permissions);

    /* general switch */
    {
        let shown_container: "settings" | "permissions";

        const header = tag.find(".header");

        const category_permissions = header.find(".category-permissions");
        event_registry.on("show_container", data => {
            category_permissions.toggleClass("selected", data.container === "permissions");
            container_permissions.toggleClass("hidden", data.container !== "permissions");
        });
        category_permissions.on('click', event => {
            if(shown_container === "permissions") return;
            event_registry.fire("show_container", { container: "permissions" });
        });

        const category_settings = header.find(".category-settings");
        event_registry.on("show_container", data => {
            category_settings.toggleClass("selected", data.container === "settings");
            container_settings.toggleClass("hidden", data.container !== "settings");
        });
        category_settings.on('click', event => {
            if(shown_container === "settings") return;
            event_registry.fire("show_container", { container: "settings" });
        });

        event_registry.on("show_container", data => shown_container = data.container);
    }

    /* input length fix */
    tag.find("input[maxlength]").on("input", event => {
        const input = event.target as HTMLInputElement;
        const max = parseInt(input.getAttribute("maxlength"));
        const text = input.value;
        if(!isNaN(max) && text && text.length > max)
            //input.value = text.substr(text.length - max);
            input.value = text.substr(0, max);
    });

    /* initialize */
    event_registry.fire("show_container", { container: "settings" });
    return tag.children();
}

function build_settings_container(event_registry: Registry<modal.music_manage>, tag: JQuery<HTMLElement>) {
    const show_change_error = (header, message) => {
        createErrorModal(tr("Failed to change value"), header + "<br>" + message).open();
    };

    /* music bot settings */
    {
        const container = tag.find(".settings-bot");

        /* bot name */
        {
            const input = container.find(".option-bot-name");
            let last_value = undefined;

            event_registry.on("query_bot_status", event => {
                last_value = undefined;
                input
                    .prop("disabled", true)
                    .val(null)
                    .attr("placeholder", tr("loading..."));
            });

            event_registry.on("bot_status", event => {
                if(event.status === "error")
                    input
                        .prop("disabled", true)
                        .val(null)
                        .attr("placeholder", event.error_msg || tr("error while loading"));
                else
                    input
                        .prop("disabled", false)
                        .attr("placeholder", null)
                        .val(last_value = event.data.name);
            });

            event_registry.on("set_bot_status_result", event => {
                if(event.key !== "name") return;

                if(event.status !== "success")
                    show_change_error(tr("Failed to set bot name"), event.error_msg || tr("timeout"));
                else
                    last_value = event.value;

                input
                    .prop("disabled", false)
                    .attr("placeholder", null)
                    .val(last_value);
            });

            input.on("keyup", event => event.key === "Enter" && input.trigger("focusout"));
            input.on("focusout", event => {
                const value = input.val() as string;
                if(value === last_value) return;
                if(!value) {
                    input.val(last_value);
                    return;
                }

                input
                    .prop("disabled", true)
                    .val(null)
                    .attr("placeholder", tr("applying..."));

                event_registry.fire("set_bot_status", {
                    key: "name",
                    value: value
                });
            });
        }

        /* country flag */
        {
            const input = container.find(".option-bot-country");
            const flag = container.find(".container-country .country");
            let last_value = undefined, fallback_country = undefined;

            const update_country_code = input => {
                input = input || fallback_country || "ts";
                flag.each((_, e) => {
                    for(const [index, klass] of e.classList.entries())
                        if(klass.startsWith("flag-"))
                            e.classList.remove(klass);
                });
                flag.addClass("flag-" + input.toLowerCase());
                flag.attr("title", i18nc.country_name(input, tr("Unknown country")));
            };

            event_registry.on("query_bot_status", event => {
                last_value = undefined;
                input
                    .prop("disabled", true)
                    .val(null)
                    .attr("placeholder", "...");
                update_country_code("ts");
            });

            event_registry.on("bot_status", event => {
                if(event.status === "error")
                    input
                        .prop("disabled", true)
                        .val(null)
                        .attr("placeholder", "err");
                else {
                    input
                        .prop("disabled", false)
                        .attr("placeholder", null)
                        .val(last_value = event.data.country_code);
                    fallback_country = event.data.default_country_code;
                }
                update_country_code(last_value);
            });

            event_registry.on("set_bot_status_result", event => {
                if(event.key !== "country_code") return;

                if(event.status !== "success")
                    show_change_error(tr("Failed to set bots country"), event.error_msg || tr("timeout"));
                else
                    last_value = event.value;

                input
                    .prop("disabled", false)
                    .attr("placeholder", null)
                    .val(last_value);
                update_country_code(last_value);
            });

            input.on("input", () => {
                update_country_code(input.val());
                input.firstParent(".input-boxed").removeClass("is-invalid");
            });

            input.on("keyup", event => event.key === "Enter" && input.trigger("focusout"));
            input.on("focusout", event => {
                const value = input.val() as string;
                if(value === last_value) return;
                if(value && value.length != 2) {
                    input.firstParent(".input-boxed").addClass("is-invalid");
                    return;
                }

                input
                    .prop("disabled", true)
                    .val(null)
                    .attr("placeholder", "...");

                event_registry.fire("set_bot_status", {
                    key: "country_code",
                    value: value
                });
            });
        }

        /* flag channel commander */
        {
            const input = container.find(".option-channel-commander") as JQuery<HTMLInputElement>;
            const label = input.parents("label");

            let last_value = undefined;

            event_registry.on("query_bot_status", event => {
                last_value = undefined;

                label.addClass("disabled");
                input
                    .prop("checked", false)
                    .prop("disabled", true);
            });

            event_registry.on("bot_status", event => {
                if(event.status === "error") {
                    label.addClass("disabled");
                    input
                        .prop("checked", false)
                        .prop("disabled", true);
                } else {
                    label.removeClass("disabled");
                    input
                        .prop("checked", last_value = event.data.channel_commander)
                        .prop("disabled", false);
                }
            });

            event_registry.on("set_bot_status_result", event => {
                if(event.key !== "channel_commander") return;

                if(event.status !== "success")
                    show_change_error(tr("Failed to change channel commander state"), event.error_msg || tr("timeout"));
                else
                    last_value = event.value;

                label.removeClass("disabled");
                input
                    .prop("checked", last_value)
                    .prop("disabled", false);
            });

            input.on("change", event => {
                label.addClass("disabled");
                input.prop("disabled", true);
                event_registry.fire("set_bot_status", {
                    key: "channel_commander",
                    value: input.prop("checked")
                });
            });
        }

        /* flag priority speaker */
        {
            const input = container.find(".option-priority-speaker") as JQuery<HTMLInputElement>;
            const label = input.parents("label");

            let last_value = undefined;

            event_registry.on("query_bot_status", event => {
                last_value = undefined;

                label.addClass("disabled");
                input
                    .prop("checked", false)
                    .prop("disabled", true);
            });

            event_registry.on("bot_status", event => {
                if(event.status === "error") {
                    label.addClass("disabled");
                    input
                        .prop("checked", false)
                        .prop("disabled", true);
                } else {
                    label.removeClass("disabled");
                    input
                        .prop("checked", last_value = event.data.priority_speaker)
                        .prop("disabled", false);
                }
            });

            event_registry.on("set_bot_status_result", event => {
                if(event.key !== "priority_speaker") return;

                if(event.status !== "success")
                    show_change_error(tr("Failed to change priority speaker state"), event.error_msg || tr("timeout"));
                else
                    last_value = event.value;

                label.removeClass("disabled");
                input
                    .prop("checked", last_value)
                    .prop("disabled", false);
            });

            input.on("change", event => {
                label.addClass("disabled");
                input.prop("disabled", true);
                event_registry.fire("set_bot_status", {
                    key: "priority_speaker",
                    value: input.prop("checked")
                });
            });
        }

        /* status load timeout */
        {
            let timeout;
            event_registry.on("query_bot_status", event => {
                timeout = setTimeout(() => {
                    event_registry.fire("bot_status", {
                        status: "error",
                        error_msg: tr("load timeout")
                    });
                }, 5000);
            });

            event_registry.on("bot_status", event => clearTimeout(timeout));
        }

        /* set status timeout */
        {
            let timeouts: {[key: string]:any} = {};
            event_registry.on("set_bot_status", event => {
                clearTimeout(timeouts[event.key]);
                timeouts[event.key] = setTimeout(() => {
                    event_registry.fire("set_bot_status_result", {
                        status: "timeout",
                        key: event.key,
                    });
                }, 5000);
            });

            event_registry.on("set_bot_status_result", event => {
                clearTimeout(timeouts[event.key]);
                delete timeouts[event.key];
            });
        }
    }

    /* music bot settings */
    {
        const container = tag.find(".settings-playlist");

        /* playlist replay mode */
        {
            const input = container.find(".option-replay-mode") as JQuery<HTMLSelectElement>;
            let last_value = undefined;

            const update_value = text => {
                if(text) {
                    input.prop("disabled", true).addClass("disabled");
                    input.val("-1");
                    input.find("option[value=-1]").text(text);
                } else if(last_value >= 0 && last_value <= 3) {
                    input
                        .prop("disabled", false)
                        .removeClass("disabled");
                    input.val(last_value);
                } else {
                    update_value(tr("invalid value"));
                }
            };

            event_registry.on("query_playlist_status", event => {
                last_value = undefined;
                update_value(tr("loading..."));
            });

            event_registry.on("playlist_status", event => {
                if(event.status === "error") {
                    update_value(event.error_msg || tr("error while loading"));
                } else {
                    last_value = event.data.replay_mode;
                    update_value(undefined);
                }
            });

            event_registry.on("set_playlist_status_result", event => {
                if(event.key !== "replay_mode") return;

                if(event.status !== "success")
                    show_change_error(tr("Failed to change replay mode"), event.error_msg || tr("timeout"));
                else
                    last_value = event.value;
                update_value(undefined);
            });

            input.on("keyup", event => event.key === "Enter" && input.trigger("focusout"));
            input.on("change", event => {
                const value = parseInt(input.val() as string);
                console.log(value);
                if(isNaN(value)) return;

                update_value(tr("applying..."));
                event_registry.fire("set_playlist_status", {
                    key: "replay_mode",
                    value: value
                });
            });
        }

        /* playlist max size */
        {
            const input = container.find(".container-max-playlist-size input");
            let last_value = undefined;

            event_registry.on("query_playlist_status", event => {
                last_value = undefined;
                input
                    .prop("disabled", true)
                    .val(null)
                    .attr("placeholder", tr("loading..."))
                    .firstParent(".input-boxed").addClass("disabled");
            });

            event_registry.on("playlist_status", event => {
                if(event.status === "error")
                    input
                        .prop("disabled", true)
                        .val(null)
                        .attr("placeholder", event.error_msg || tr("error while loading"))
                        .firstParent(".input-boxed").addClass("disabled");
                else
                    input
                        .prop("disabled", false)
                        .attr("placeholder", null)
                        .val((last_value = event.data.max_size).toString())
                        .firstParent(".input-boxed").removeClass("disabled");
            });

            event_registry.on("set_playlist_status_result", event => {
                if(event.key !== "max_size") return;

                if(event.status !== "success")
                    show_change_error(tr("Failed to change max playlist size"), event.error_msg || tr("timeout"));
                else
                    last_value = event.value;

                input
                    .prop("disabled", false)
                    .attr("placeholder", null)
                    .val(last_value)
                    .firstParent(".input-boxed").removeClass("disabled");
            });

            input.on("input", event => input.parentsUntil(".input-boxed").removeClass("is-invalid"));
            input.on("keyup", event => event.key === "Enter" && input.trigger("focusout"));
            input.on("focusout", event => {
                const value = input.val() as string;
                if(value === last_value) return;
                if(value === "") {
                    input.val(last_value);
                    return;
                }
                if(isNaN(parseInt(value))) {
                    input.parentsUntil(".input-boxed").addClass("is-invalid");
                    return;
                }

                input
                    .prop("disabled", true)
                    .val(null)
                    .attr("placeholder", tr("applying..."))
                    .firstParent(".input-boxed").addClass("disabled");

                event_registry.fire("set_playlist_status", {
                    key: "max_size",
                    value: parseInt(value)
                });
            });
        }

        /* flag delete played */
        {
            const input = container.find(".option-delete-played-songs") as JQuery<HTMLInputElement>;
            const label = input.parents("label");

            let last_value = undefined;

            event_registry.on("query_playlist_status", event => {
                last_value = undefined;

                label.addClass("disabled");
                input
                    .prop("checked", false)
                    .prop("disabled", true);
            });

            event_registry.on("playlist_status", event => {
                if(event.status === "error") {
                    label.addClass("disabled");
                    input
                        .prop("checked", false)
                        .prop("disabled", true);
                } else {
                    label.removeClass("disabled");
                    input
                        .prop("checked", last_value = event.data.delete_played)
                        .prop("disabled", false);
                }
            });

            event_registry.on("set_playlist_status_result", event => {
                if(event.key !== "delete_played") return;

                if(event.status !== "success")
                    show_change_error(tr("Failed to change delete state"), event.error_msg || tr("timeout"));
                else
                    last_value = event.value;

                label.removeClass("disabled");
                input
                    .prop("checked", last_value)
                    .prop("disabled", false);
            });

            input.on("change", event => {
                label.addClass("disabled");
                input.prop("disabled", true);
                event_registry.fire("set_playlist_status", {
                    key: "delete_played",
                    value: input.prop("checked")
                });
            });
        }

        /* flag notify song change */
        {
            const input = container.find(".option-notify-songs-change") as JQuery<HTMLInputElement>;
            const label = input.parents("label");

            let last_value = undefined;

            event_registry.on("query_playlist_status", event => {
                last_value = undefined;

                label.addClass("disabled");
                input
                    .prop("checked", false)
                    .prop("disabled", true);
            });

            event_registry.on("playlist_status", event => {
                if(event.status === "error") {
                    label.addClass("disabled");
                    input
                        .prop("checked", false)
                        .prop("disabled", true);
                } else {
                    label.removeClass("disabled");
                    input
                        .prop("checked", last_value = event.data.notify_song_change)
                        .prop("disabled", false);
                }
            });

            event_registry.on("set_playlist_status_result", event => {
                if(event.key !== "notify_song_change") return;

                if(event.status !== "success")
                    show_change_error(tr("Failed to change notify state"), event.error_msg || tr("timeout"));
                else
                    last_value = event.value;

                label.removeClass("disabled");
                input
                    .prop("checked", last_value)
                    .prop("disabled", false);
            });

            input.on("change", event => {
                label.addClass("disabled");
                input.prop("disabled", true);
                event_registry.fire("set_playlist_status", {
                    key: "notify_song_change",
                    value: input.prop("checked")
                });
            });
        }

        /* status load timeout */
        {
            let timeout;
            event_registry.on("query_playlist_status", event => {
                timeout = setTimeout(() => {
                    event_registry.fire("playlist_status", {
                        status: "error",
                        error_msg: tr("load timeout")
                    });
                }, 5000);
            });

            event_registry.on("playlist_status", event => clearTimeout(timeout));
        }

        /* set status timeout */
        {
            let timeouts: {[key: string]:any} = {};
            event_registry.on("set_playlist_status", event => {
                clearTimeout(timeouts[event.key]);
                timeouts[event.key] = setTimeout(() => {
                    event_registry.fire("set_playlist_status_result", {
                        status: "timeout",
                        key: event.key,
                    });
                }, 5000);
            });

            event_registry.on("set_playlist_status_result", event => {
                clearTimeout(timeouts[event.key]);
                delete timeouts[event.key];
            });
        }
    }

    /* reload button */
    {
        const button = tag.find(".button-reload");
        let timeout;

        event_registry.on(["query_bot_status", "query_playlist_status"], event => {
            button.prop("disabled", true);

            clearTimeout(timeout);
            timeout = setTimeout(() => {
                button.prop("disabled", false);
            }, 1000);
        });

        button.on("click", event => {
            event_registry.fire("query_bot_status");
            event_registry.fire("query_playlist_status");
        });
    }

    tooltip.initialize(tag);

    /* initialize on show */
    {
        let initialized = false;
        event_registry.on("show_container", event => {
            if(event.container !== "settings" || initialized) return;
            initialized = true;

            event_registry.fire("query_bot_status");
            event_registry.fire("query_playlist_status");
        });
    }
}

function build_permission_container(event_registry: Registry<modal.music_manage>, tag: JQuery<HTMLElement>) {
    /* client search mechanism */
    {
        const container = tag.find(".table-head .column-client-specific .client-select");
        let list_shown = false;

        /* search list show/hide */
        {
            const button_list_clients = container.find(".button-list-clients");
            button_list_clients.on('click', event =>
                event_registry.fire(list_shown ? "hide_client_list" : "show_client_list"));

            event_registry.on("show_client_list", () => {
                list_shown = true;
                button_list_clients.text(tr("Hide clients"));
            });

            event_registry.on("hide_client_list", () => {
                list_shown = false;
                button_list_clients.text(tr("List clients"));
            });
        }

        /* the search box */
        {
            const input_search = container.find(".input-search");
            const button_search = container.find(".button-search");

            let search_timeout;
            let last_query;
            input_search.on('keyup', event => {
                const text = input_search.val() as string;
                if(text === last_query) return;

                if(text)
                    event_registry.fire("filter_client_list", { filter: text });
                else
                    event_registry.fire("filter_client_list", { filter: undefined });

                input_search.toggleClass("is-invalid", !list_shown && text === last_query);
                if(!list_shown) {
                    button_search.prop("disabled", !text || !!search_timeout);
                } else {
                    last_query = text;
                }
            });

            input_search.on('keydown', event => {
                if(event.key === "Enter" && !list_shown && !button_search.prop("disabled"))
                    button_search.trigger("click");
            });

            event_registry.on("show_client_list", () => {
                button_search.prop("disabled", true);
                input_search.attr("placeholder", tr("Search client list"));
            });

            event_registry.on("hide_client_list", () => {
                button_search.prop("disabled", !input_search.val() || !!search_timeout);
                input_search.attr("placeholder", tr("Client uid or database id"));
            });

            button_search.on("click", event => {
                button_search.prop("disabled", true);

                input_search.blur();
                const text = input_search.val() as string;
                last_query = text;
                event_registry.fire("search_client", {
                    text: text
                });
                search_timeout = setTimeout(() => event_registry.fire("search_client_result", {
                    status: "timeout"
                }), 5000);
            });

            event_registry.on("search_client_result", event => {
                clearTimeout(search_timeout);
                search_timeout = 0;

                button_search.prop("disabled", !input_search.val());
                if(event.status === "timeout") {
                    createErrorModal(tr("Client search failed"), tr("Failed to perform client search.<br>Search resulted in a timeout.")).open();
                    return;
                } else if(event.status === "error" || event.status === "empty") {
                    //TODO: Display the error somehow?
                    input_search.addClass("is-invalid");
                    return;
                } else {
                    event_registry.fire("special_client_set", {
                        client: event.client
                    });
                }
            });
        }

        /* the client list */
        {
            const container = tag.find(".overlay-client-list");

            event_registry.on("show_client_list", () => container.removeClass("hidden"));
            event_registry.on("hide_client_list", () => container.addClass("hidden"));

            const button_refresh = container.find(".button-clientlist-refresh");

            const container_entries = container.find(".container-client-list");
            event_registry.on("special_client_list", data => {
                button_refresh.prop("disabled", false);
                container.find(".overlay").addClass("hidden");
                if(data.status === "error-permission") {
                    const overlay = container.find(".overlay-query-error-permissions");
                    overlay.find("a").text(tr("Insufficient permissions"));
                    overlay.removeClass("hidden");
                } else if(data.status === "success") {
                    container_entries.find(".client").remove(); /* clear  */

                    if(!data.clients.length) {
                        const overlay = container.find(".overlay-empty-list");
                        overlay.removeClass("hidden");
                    } else {
                        for(const client of data.clients) {
                            const tag = $.spawn("div").addClass("client").append(
                                htmltags.generate_client_object({
                                    add_braces: false,
                                    client_id: 0,
                                    client_database_id: client.database_id,
                                    client_name: client.name,
                                    client_unique_id: client.unique_id
                                })
                            );
                            tag.on('dblclick', event => event_registry.fire("special_client_set", { client: client }));
                            tag.attr("x-filter", client.database_id + "_" + client.name + "_" + client.unique_id);
                            container_entries.append(tag);
                        }
                    }
                } else {
                    const overlay = container.find(".overlay-query-error");
                    overlay.find("a").text(data.error_msg ? data.error_msg : tr("query failed"));
                    overlay.removeClass("hidden");
                }
            });

            /* refresh button */
            button_refresh.on('click', event => {
                button_refresh.prop("disabled", true);
                event_registry.fire("query_special_clients");
            });


            /* special client list query timeout handler */
            {
                let query_timeout;
                event_registry.on("query_special_clients", event => {
                    query_timeout = setTimeout(() => {
                        event_registry.fire("special_client_list", {
                            status: "error",
                            error_msg: tr("Query timeout")
                        });
                    }, 5000);
                });

                event_registry.on("special_client_list", event => clearTimeout(query_timeout));
            }

            /* first time client list show */
            {
                let shown;
                event_registry.on('show_client_list', event => {
                    if(shown) return;
                    shown = true;

                    event_registry.fire("query_special_clients");
                });
            }

            /* the client list filter */
            {
                let filter;

                const overlay = container.find(".overlay-filter-no-result");
                const update_filter = () => {
                    let shown = 0, hidden = 0;
                    container_entries.find(".client").each(function () {
                        const text = this.getAttribute("x-filter");
                        if(!filter || text.toLowerCase().indexOf(filter) != -1) {
                            this.classList.remove("hidden");
                            shown++;
                        } else {
                            this.classList.add("hidden");
                            hidden++;
                        }
                    });
                    if(shown == 0 && hidden == 0) return;
                    overlay.toggleClass("hidden", shown != 0);
                };

                event_registry.on("special_client_list", event => update_filter());
                event_registry.on("filter_client_list", event => {
                    filter = (event.filter || "").toLowerCase();
                    update_filter();
                });
            }
        }

        event_registry.on("special_client_set", event => {
            container.toggleClass("hidden", !!event.client);
            event_registry.fire("hide_client_list");
        });
    }

    /* the client info */
    {
        const container = tag.find(".table-head .column-client-specific .client-info");

        container.find(".button-client-deselect").on("click", event => {
            event_registry.fire("special_client_set", { client: undefined });
        });

        event_registry.on("special_client_set", event => {
            container.toggleClass("hidden", !event.client);

            const client_container = container.find(".container-selected-client");
            client_container.find(".htmltag-client").remove();
            if(event.client) {
                client_container.append(htmltags.generate_client_object({
                    client_unique_id: event.client.unique_id,
                    client_name: event.client.name,
                    client_id: 0,
                    client_database_id: event.client.database_id,
                    add_braces: false
                }));
            }
        });
    }

    const power_needed_map = {
        i_client_music_rename_power: "i_client_music_needed_rename_power",
        i_client_music_modify_power: "i_client_music_needed_modify_power",
        i_client_music_delete_power: "i_client_music_needed_delete_power",
        i_playlist_view_power: "i_playlist_needed_view_power",
        i_playlist_modify_power: "i_playlist_needed_modify_power",
        i_playlist_permission_modify_power: "i_playlist_needed_permission_modify_power",
        i_playlist_song_add_power: "i_playlist_song_needed_add_power",
        i_playlist_song_move_power: "i_playlist_song_needed_move_power",
        i_playlist_song_remove_power: "i_playlist_song_needed_remove_power",
        b_virtualserver_playlist_permission_list: "b_virtualserver_playlist_permission_list"
    };
    const needed_power_map = Object.entries(power_needed_map).reduce((ret, entry) => {
        const [key, value] = entry;
        ret[value] = key;
        return ret;
    }, {});

    /* general permissions */
    {
        /* permission input functionality */
        {
            tag.find(".general-permission").each((_, _e) => {
                const elem = $(_e) as JQuery<HTMLDivElement>;

                const permission_name = elem.attr("x-permission");
                if(!permission_name) return;

                const input = elem.find("input");
                input.attr("maxlength", 6);

                let last_sync_value = undefined;

                event_registry.on("query_general_permissions", event => {
                    input.prop("disabled", true).val(null);
                    input.attr("placeholder", tr("loading..."));
                });

                event_registry.on("general_permissions", event => {
                    input.prop("disabled", true).val(null);
                    if(event.status === "timeout") {
                        input.attr("placeholder", tr("load timeout"));
                    } else if(event.status === "success") {
                        input.prop("disabled", false); //TODO: Check permissions?
                        input.attr("placeholder", null);
                        const value = event.permissions ? event.permissions[permission_name] || 0 : 0;
                        last_sync_value = value;
                        input.val(value);
                    } else {
                        input.attr("placeholder", event.error_msg || tr("load error"));
                    }
                });

                event_registry.on("set_general_permission_result", event => {
                    if(event.key !== permission_name) return;

                    input.prop("disabled", false); //TODO: Check permissions?
                    input.attr("placeholder", null);
                    if(event.status === "success") {
                        input.val(event.value);
                        last_sync_value = event.value;
                    } else if(event.status === "error") {
                        if(typeof last_sync_value === "number") input.val(last_sync_value);
                        createErrorModal(tr("Failed to change permission"), tra("Failed to change permission:{:br:}{}", event.error_msg)).open();
                    }
                });

                input.on("focusout", event => {
                    if(input.prop("disabled")) return;

                    const value = parseInt(input.val() as string);
                    if(value === last_sync_value) return;

                    input.prop("disabled", true).val(null);
                    input.attr("placeholder", tr("applying..."));
                    event_registry.fire("set_general_permission", {
                        key: permission_name,
                        value: value || 0
                    });
                });
                input.on("keyup", event => event.key === "Enter" && input.blur());
            });
        }

        /* the tooltip functionality */
        {
            tag.find(".general-permission").each((_, _e) => {
                const elem = $(_e) as JQuery<HTMLDivElement>;

                const permission_name = elem.attr("x-permission");
                if(!permission_name) return;

                const required_power = needed_power_map[permission_name];
                if(!required_power) return;

                let last_sync_value = undefined;
                let current_tag: JQuery;

                let loading = false;
                let query_result: {
                    status: "error" | "timeout" | "success"
                    groups?: {
                        name: string,
                        value: number,
                        id: number
                    }[],
                    error_msg?: string
                };

                event_registry.on("general_permissions", event => {
                    if(event.status === "success")
                        last_sync_value = event.permissions ? event.permissions[permission_name] || 0 : 0;
                });

                event_registry.on("set_general_permission_result", event => {
                    if(event.key !== permission_name) return;

                    if(event.status === "success")
                        last_sync_value = event.value;
                });

                event_registry.on("refresh_permissions", event => {
                    query_result = undefined; /* require for the next time */
                });

                const show_query_result = () => {
                    if(!current_tag) return;

                    const container_groups = current_tag.find(".container-groups");
                    container_groups.children().remove();
                    current_tag.find(".container-status").addClass("hidden");

                    if(loading) {
                        current_tag.find(".status-loading").removeClass("hidden");
                    } else if(!query_result || query_result.status === "error") {
                        current_tag
                            .find(".status-error").removeClass("hidden")
                            .text((query_result ? query_result.error_msg : "") || tr("failed to query data"));
                    } else if(query_result.status === "timeout") {
                        current_tag
                            .find(".status-error").removeClass("hidden")
                            .text(tr("timeout while loading"));
                    } else {
                        let count = 0;
                        for(const group of (query_result.groups || [])) {
                            if(group.value !== -1 && group.value < last_sync_value) continue;

                            count++;
                            container_groups.append($.spawn("div").addClass("group").text(
                                " - " + group.name + " (" + group.id + ")"
                            ));
                        }

                        if(count === 0) current_tag.find(".status-no-groups").removeClass("hidden");
                    }
                };

                tooltip.initialize(elem, {
                    on_show(tag: JQuery<HTMLElement>) {
                        current_tag = tag;

                        if(!query_result && !loading) {
                            event_registry.fire("query_group_permissions", {
                                permission_name: required_power
                            });
                            loading = true;
                        }
                        show_query_result();
                    },
                    on_hide(tag: JQuery<HTMLElement>) {
                        current_tag = undefined;
                    }
                });

                event_registry.on("group_permissions", event => {
                    if(event.permission_name !== required_power) return;

                    loading = false;
                    query_result = event;
                    show_query_result();
                });
            });


            /* refresh mechanism */
            {
                event_registry.on("refresh_permissions", event => event_registry.fire("query_general_permissions"));
            }
        }

        /* permission set timeout */
        {
            let permission_timers: {[key: string]:any} = {};
            event_registry.on("set_general_permission", event => {
                if(permission_timers[event.key])
                    clearTimeout(permission_timers[event.key]);
                permission_timers[event.key] = setTimeout(() => {
                    event_registry.fire("set_general_permission_result", {
                        key: event.key,
                        status: "error",
                        error_msg: tr("controller timeout")
                    });
                }, 5000);
            });

            event_registry.on("set_general_permission_result", event => {
                clearTimeout(permission_timers[event.key]);
                delete permission_timers[event.key];
            });
        }

        /* group query timeout */
        {
            let timers: {[key: string]:any} = {};
            event_registry.on("query_group_permissions", event => {
                if(timers[event.permission_name])
                    clearTimeout(timers[event.permission_name]);
                timers[event.permission_name] = setTimeout(() => {
                    event_registry.fire("group_permissions", {
                        permission_name: event.permission_name,
                        status: "timeout"
                    });
                }, 5000);
            });

            event_registry.on("group_permissions", event => {
                clearTimeout(timers[event.permission_name]);
                delete timers[event.permission_name];
            });
        }

        /* query timeout */
        {
            let query_timeout;
            event_registry.on("query_general_permissions", event => {
                clearTimeout(query_timeout);
                query_timeout = setTimeout(() => {
                    event_registry.fire("general_permissions", {
                        status: "timeout"
                    });
                }, 5000);
            });

            event_registry.on("general_permissions", event => clearTimeout(query_timeout));
        }

        /* refresh button */
        {
            const button = tag.find(".button-permission-refresh");
            let refresh_timer;

            let loading_client_permissions = false;
            let loading_general_permissions = false;

            const update_button = () =>
                button.prop("disabled", refresh_timer || loading_client_permissions || loading_general_permissions);

            event_registry.on("query_general_permissions", event => {
                loading_general_permissions = true;
                update_button();
            });

            event_registry.on("general_permissions", event => {
                loading_general_permissions = false;
                update_button();
            });

            event_registry.on("query_client_permissions", event => {
                loading_client_permissions = true;
                update_button();
            });

            event_registry.on("client_permissions", event => {
                loading_client_permissions = false;
                update_button();
            });

            button.on('click', event => {
                event_registry.fire("refresh_permissions");

                /* allow refreshes only every second */
                refresh_timer = setTimeout(() => {
                    refresh_timer = undefined;
                    update_button();
                }, 1000);
            });
        }
    }

    /* client specific permissions */
    {
        const container = tag.find(".column-client-specific");

        let client_database_id = 0;
        let needed_permissions: {[key: string]:number} = {};

        /* needed permissions updater */
        {
            event_registry.on("general_permissions", event => {
                if(event.status !== "success") return;

                needed_permissions = event.permissions;
            });

            event_registry.on("set_general_permission_result", event => {
                if (event.status !== "success") return;

                needed_permissions[event.key] = event.value;
            });
        }

        event_registry.on("special_client_set", event => {
            client_database_id = event.client ? event.client.database_id : 0;
            container.find(".client-permission").toggleClass("hidden", !event.client);

            if(client_database_id)
                event_registry.fire("query_client_permissions", { client_database_id: client_database_id });
        });

        const enabled_class = "client-apply";
        const disabled_class = "client-delete";

        container.find(".client-permission").each((_, _e) => {
            const elem = $(_e);

            const input = elem.find("input");
            const status_indicator = elem.find(".icon_em");

            const permission_name = elem.attr("x-permission") as string;
            const permission_needed_name = power_needed_map[permission_name];

            let last_sync_value = undefined;
            let hide_indicator = false;

            if(typeof permission_needed_name !== "string") {
                log.warn(LogCategory.GENERAL, tr("Missing permission needed mapping for %s"), permission_name);
                return;
            }

            const update_indicator = () => {
                const value = parseInt(input.val() as string);
                const needed = typeof needed_permissions[permission_needed_name] === "number" ? needed_permissions[permission_needed_name] : 0;
                const flag = value == -1 ? true : isNaN(value) || value == 0 ? false : value >= needed;

                status_indicator.toggle(!hide_indicator);
                status_indicator.toggleClass(enabled_class, flag).toggleClass(disabled_class, !flag);
            };

            event_registry.on("special_client_set", event => {
                last_sync_value = undefined;
            });
            event_registry.on("general_permissions", event => update_indicator());
            event_registry.on("set_general_permission_result", event => {
                if(event.key !== permission_needed_name) return;
                if(event.status !== "success") return;

                update_indicator();
            });

            /* loading the permission */
            event_registry.on("query_client_permissions", event => {
                if(event.client_database_id !== client_database_id) return;

                last_sync_value = undefined;
                hide_indicator = true;
                input.prop("disabled", true).val(null);
                input.attr("placeholder", tr("loading..."));
                update_indicator();
            });

            event_registry.on('client_permissions', event => {
                if(event.client_database_id !== client_database_id) return;

                hide_indicator = false;
                input.prop("disabled", true).val(null);
                if(event.status === "timeout") {
                    input.attr("placeholder", tr("load timeout"));
                } else if(event.status === "success") {
                    input.prop("disabled", false); //TODO: Check permissions?
                    input.attr("placeholder", null);
                    const value = event.permissions ? event.permissions[permission_name] || 0 : 0;
                    last_sync_value = value;
                    input.val(value);
                } else {
                    input.attr("placeholder", event.error_msg || tr("load error"));
                }
                update_indicator();
            });

            /* permission editing */
            input.attr("maxlength", 6);
            input.on("focusout", event => {
                if(!client_database_id) return;

                const value = parseInt(input.val() as string);
                if(value === last_sync_value) return;

                input.prop("disabled", true).val(null);
                input.attr("placeholder", tr("applying..."));
                event_registry.fire("set_client_permission", {
                    client_database_id: client_database_id,
                    key: permission_name,
                    value: value || 0
                });
                hide_indicator = true;
                update_indicator();
            });

            input.on("change", () => update_indicator());
            input.on("keyup", event => event.key === "Enter" && input.blur());

            event_registry.on("set_client_permission_result", event => {
                if(event.key !== permission_name) return;

                input.prop("disabled", false); //TODO: Check permissions?
                input.attr("placeholder", null);
                if(event.status === "success") {
                    input.val(event.value);
                    last_sync_value = event.value;
                } else if(event.status === "error") {
                    if(typeof last_sync_value === "number") input.val(last_sync_value);
                    createErrorModal(tr("Failed to change permission"), tra("Failed to change permission:{:br:}{}", event.error_msg)).open();
                }
                hide_indicator = false;
                update_indicator();
            });
        });

        /* client permission query timeout */
        {
            let timeout: {[key: number]: any} = {};
            event_registry.on("query_client_permissions", event => {
                if(timeout[event.client_database_id])
                    clearTimeout(timeout[event.client_database_id]);
                timeout[event.client_database_id] = setTimeout(() => {
                    event_registry.fire("client_permissions", {
                        status: "timeout",
                        client_database_id: event.client_database_id
                    });
                }, 5000);
            });

            event_registry.on("client_permissions", event => {
                clearTimeout(timeout[event.client_database_id]);
            });
        }

        /* client permission set timeout */
        {
            let timeout: {[key: string]: any} = {};
            event_registry.on("set_client_permission", event => {
                const key = event.client_database_id + "_" + event.key;
                if(timeout[key])
                    clearTimeout(timeout[key]);

                timeout[key] = setTimeout(() => {
                    event_registry.fire("set_client_permission_result", {
                        key: event.key,
                        status: "error",
                        client_database_id: event.client_database_id,
                        error_msg: tr("timeout")
                    });
                }, 5000);
            });

            event_registry.on("set_client_permission_result", event => {
                const key = event.client_database_id + "_" + event.key;
                if(timeout[key]) {
                    clearTimeout(timeout[key]);
                    delete timeout[key];
                }
            });
        }

        event_registry.on("refresh_permissions", event => {
            if(client_database_id)
                event_registry.fire("query_client_permissions", { client_database_id: client_database_id });
        });
        tooltip.initialize(container);
    }

    /* a title attribute for permission column */
    tag.find(".table-body .column-permission a").each(function () {
        this.setAttribute("title", this.textContent);
    });

    /* initialize on show */
    {
        let initialized = false;
        event_registry.on("show_container", event => {
            if(event.container !== "permissions" || initialized) return;
            initialized = true;

            event_registry.fire("special_client_set", { client: undefined });
            event_registry.fire("query_general_permissions", {});
        });
    }
}