export class ServerProperties {
    virtualserver_host: string = "";
    virtualserver_port: number = 0;

    virtualserver_name: string = "";
    virtualserver_name_phonetic: string = "";
    virtualserver_icon_id: number = 0;
    virtualserver_version: string = "unknown";
    virtualserver_platform: string = "unknown";
    virtualserver_unique_identifier: string = "";

    virtualserver_clientsonline: number = 0;
    virtualserver_queryclientsonline: number = 0;
    virtualserver_channelsonline: number = 0;
    virtualserver_uptime: number = 0;
    virtualserver_created: number = 0;
    virtualserver_maxclients: number = 0;
    virtualserver_reserved_slots: number = 0;

    virtualserver_password: string = "";
    virtualserver_flag_password: boolean = false;

    virtualserver_ask_for_privilegekey: boolean = false;

    virtualserver_welcomemessage: string = "";

    virtualserver_hostmessage: string = "";
    virtualserver_hostmessage_mode: number = 0;

    virtualserver_hostbanner_url: string = "";
    virtualserver_hostbanner_gfx_url: string = "";
    virtualserver_hostbanner_gfx_interval: number = 0;
    virtualserver_hostbanner_mode: number = 0;

    virtualserver_hostbutton_tooltip: string = "";
    virtualserver_hostbutton_url: string = "";
    virtualserver_hostbutton_gfx_url: string = "";

    virtualserver_codec_encryption_mode: number = 0;

    virtualserver_default_music_group: number = 0;
    virtualserver_default_server_group: number = 0;
    virtualserver_default_channel_group: number = 0;
    virtualserver_default_channel_admin_group: number = 0;

    //Special requested properties
    virtualserver_default_client_description: string = "";
    virtualserver_default_channel_description: string = "";
    virtualserver_default_channel_topic: string = "";

    virtualserver_antiflood_points_tick_reduce: number = 0;
    virtualserver_antiflood_points_needed_command_block: number = 0;
    virtualserver_antiflood_points_needed_ip_block: number = 0;

    virtualserver_country_code: string = "XX";

    virtualserver_complain_autoban_count: number = 0;
    virtualserver_complain_autoban_time: number = 0;
    virtualserver_complain_remove_time: number = 0;

    virtualserver_needed_identity_security_level: number = 8;
    virtualserver_weblist_enabled: boolean = false;
    virtualserver_min_clients_in_channel_before_forced_silence: number = 0;
    virtualserver_channel_temp_delete_delay_default: number = 60;
    virtualserver_priority_speaker_dimm_modificator: number = -18;

    virtualserver_max_upload_total_bandwidth: number = 0;
    virtualserver_upload_quota: number = 0;
    virtualserver_max_download_total_bandwidth: number = 0;
    virtualserver_download_quota: number = 0;

    virtualserver_month_bytes_downloaded: number = 0;
    virtualserver_month_bytes_uploaded: number = 0;
    virtualserver_total_bytes_downloaded: number = 0;
    virtualserver_total_bytes_uploaded: number = 0;
}

export const kServerConnectionInfoFields = {
    "connection_filetransfer_bandwidth_sent": "number",
    "connection_filetransfer_bandwidth_received": "number",

    "connection_filetransfer_bytes_sent_total": "number",
    "connection_filetransfer_bytes_received_total": "number",

    "connection_filetransfer_bytes_sent_month": "number",
    "connection_filetransfer_bytes_received_month": "number",

    "connection_packets_sent_total": "number",
    "connection_bytes_sent_total": "number",
    "connection_packets_received_total": "number",
    "connection_bytes_received_total": "number",

    "connection_bandwidth_sent_last_second_total": "number",
    "connection_bandwidth_sent_last_minute_total": "number",
    "connection_bandwidth_received_last_second_total": "number",
    "connection_bandwidth_received_last_minute_total": "number",

    "connection_connected_time": "number",
    "connection_packetloss_total": "number",
    "connection_ping": "number",
};

export interface ServerConnectionInfo {
    connection_filetransfer_bandwidth_sent: number;
    connection_filetransfer_bandwidth_received: number;

    connection_filetransfer_bytes_sent_total: number;
    connection_filetransfer_bytes_received_total: number;

    connection_filetransfer_bytes_sent_month: number;
    connection_filetransfer_bytes_received_month: number;

    connection_packets_sent_total: number;
    connection_bytes_sent_total: number;
    connection_packets_received_total: number;
    connection_bytes_received_total: number;

    connection_bandwidth_sent_last_second_total: number;
    connection_bandwidth_sent_last_minute_total: number;
    connection_bandwidth_received_last_second_total: number;
    connection_bandwidth_received_last_minute_total: number;

    connection_connected_time: number;
    connection_packetloss_total: number;
    connection_ping: number;
}

export type ServerConnectionInfoResult = {
    status: "success",
    result: ServerConnectionInfo,
    resultCached: boolean
} | {
    status: "no-permission",
    failedPermission: string
} | {
    status: "error",
    message: string
};