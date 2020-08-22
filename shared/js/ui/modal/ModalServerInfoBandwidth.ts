import {ServerConnectionInfo, ServerEntry} from "tc-shared/ui/server";
import {createModal, Modal} from "tc-shared/ui/elements/Modal";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {Graph} from "tc-shared/ui/elements/NetGraph";
import * as tooltip from "tc-shared/ui/elements/Tooltip";
import {network} from "tc-shared/ui/frames/chat";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

export enum RequestInfoStatus {
    SUCCESS,
    UNKNOWN,
    NO_PERMISSION
}
export type ServerBandwidthInfoUpdateCallback = (status: RequestInfoStatus, info?: ServerConnectionInfo) => any;
export function openServerInfoBandwidth(server: ServerEntry, update_callbacks?: ServerBandwidthInfoUpdateCallback[]) : Modal {
    let modal: Modal;
    let own_callbacks = !update_callbacks;
    update_callbacks = update_callbacks || [];

    modal = createModal({
        header: tr("Server bandwidth data"),
        body: () => {
            const template = $("#tmpl_server_info_bandwidth").renderTag();

            const children = template.children();
            initialize_current_bandwidth(modal, children.find(".statistic-bandwidth"), update_callbacks);
            initialize_ft_bandwidth(modal, children.find(".statistic-ft-bandwidth"), update_callbacks);
            initialize_general(template.find(".top"), update_callbacks);

            tooltip.initialize(template);
            return template.children();
        },
        footer: null,
        min_width: "25em"
    });

    if(own_callbacks) {
        const updater = setInterval(() => {
            server.request_connection_info().then(info => update_callbacks.forEach(e => e(RequestInfoStatus.SUCCESS, info))).catch(error => {
                if(error instanceof CommandResult && error.id == ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    update_callbacks.forEach(e => e(RequestInfoStatus.NO_PERMISSION));
                    return;
                }
                update_callbacks.forEach(e => e(RequestInfoStatus.UNKNOWN));
            });
        }, 1000);
        modal.close_listener.push(() => clearInterval(updater));
    }


    modal.htmlTag.find(".button-close").on('click', event => modal.close());
    modal.htmlTag.find(".modal-body").addClass("modal-server-info-bandwidth");
    modal.open();
    return modal;
}

function initialize_graph(modal: Modal, tag: JQuery, callbacks: ServerBandwidthInfoUpdateCallback[], fields: {uplaod: string, download: string}) {
    const canvas = tag.find("canvas")[0] as HTMLCanvasElement;
    const label_upload = tag.find(".upload");
    const label_download = tag.find(".download");
    let last_info: { status: RequestInfoStatus, info: ServerConnectionInfo };
    let custom_info = false;

    const show_info = (upload: number | undefined, download: number | undefined) => {
        let fallback_text = last_info && last_info.status === RequestInfoStatus.NO_PERMISSION ? tr("No permission") : tr("receiving...");

        if(typeof upload !== "number")
            upload = last_info ? last_info[fields.uplaod] : undefined;

        if(typeof download !== "number")
            download = last_info ? last_info[fields.download] : undefined;

        if(typeof upload !== "number")
            label_upload.text(fallback_text);
        else
            label_upload.text(network.format_bytes(upload, {unit: "Bytes", time: "s", exact: false}));

        if(typeof download !== "number")
            label_download.text(fallback_text);
        else
            label_download.text(network.format_bytes(download, {unit: "Bytes", time: "s", exact: false}));
    };
    show_info(undefined, undefined);

    const graph = new Graph(canvas);
    graph.insert_entry({ timestamp: Date.now(), upload: undefined, download: undefined});
    callbacks.push((status, values) => {
        last_info = {status: status, info: values};

        if(!values) {
            graph.insert_entry({ timestamp: Date.now(), upload: undefined, download: undefined});
        } else {
            graph.insert_entry({
                timestamp: Date.now(),
                download: values[fields.download], //values.connection_bandwidth_received_last_second_total,
                upload: values[fields.uplaod], //values.connection_bandwidth_sent_last_second_total
            });
        }

        /* set set that we want to show the entry within one second */
        graph._time_span.origin = Object.assign(graph.calculate_time_span(), { time: Date.now() });
        graph._time_span.target = {
            begin: Date.now() - 120 * 1000,
            end: Date.now(),
            time: Date.now() + 200
        };

        graph.cleanup();
        if(!custom_info) {
            show_info(undefined, undefined);
            graph.resize(); /* just to ensure (we have to rethink this maybe; cause it causes a recalculates the style */
        }
    });

    graph.max_gap_size(0);
    graph.initialize();

    graph.callback_detailed_hide = () => {
        custom_info = false;
        show_info(undefined, undefined);
    };

    graph.callback_detailed_info = (upload, download, timestamp, event) => {
        custom_info = true;
        show_info(upload, download);
    };

    modal.close_listener.push(() => graph.terminate());
    modal.open_listener.push(() => graph.resize());

    tag.addClass("window-resize-listener").on('resize', event => graph.resize());
}

function initialize_current_bandwidth(modal: Modal, tag: JQuery, callbacks: ServerBandwidthInfoUpdateCallback[]) {
    initialize_graph(modal, tag, callbacks, {
        uplaod: "connection_bandwidth_sent_last_second_total",
        download: "connection_bandwidth_received_last_second_total"
    });
}

function initialize_ft_bandwidth(modal: Modal, tag: JQuery, callbacks: ServerBandwidthInfoUpdateCallback[]) {
    initialize_graph(modal, tag, callbacks, {
        uplaod: "connection_filetransfer_bandwidth_sent",
        download: "connection_filetransfer_bandwidth_received"
    });
}

function initialize_general(tag: JQuery, callbacks: ServerBandwidthInfoUpdateCallback[]) {
    const tag_packets_upload = tag.find(".statistic-packets .upload");
    const tag_packets_download = tag.find(".statistic-packets .download");

    const tag_bytes_upload = tag.find(".statistic-bytes .upload");
    const tag_bytes_download = tag.find(".statistic-bytes .download");

    const tag_ft_bytes_upload = tag.find(".statistic-ft-bytes .upload");
    const tag_ft_bytes_download = tag.find(".statistic-ft-bytes .download");

    const update = (tag, value: undefined | null | number) => {
        if(typeof value === "undefined")
            tag.text(tr("receiving..."));
        else if(value === null)
            tag.text(tr("no permissions"));
        else
            tag.text(network.format_bytes(value, {unit: "Bytes", exact: false}));
    };

    const props = [
        {tag: tag_packets_download, property: "connection_packets_received_total"},
        {tag: tag_packets_upload, property: "connection_packets_sent_total"},

        {tag: tag_bytes_download, property: "connection_bytes_received_total"},
        {tag: tag_bytes_upload, property: "connection_bytes_sent_total"},

        {tag: tag_ft_bytes_upload, property: "connection_filetransfer_bytes_received_total"},
        {tag: tag_ft_bytes_download, property: "connection_filetransfer_bytes_sent_total"},
    ];

    callbacks.push((status, info) => {
        if(status === RequestInfoStatus.SUCCESS) {
            for(const entry of props)
                update(entry.tag, info[entry.property]);
        } else if(status === RequestInfoStatus.NO_PERMISSION) {
            for(const entry of props)
                update(entry.tag, null);
        } else {
            for(const entry of props)
                update(entry.tag, undefined);
        }
    });
}