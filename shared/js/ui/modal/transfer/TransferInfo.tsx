import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import {
    TransferStatus
} from "tc-shared/ui/modal/transfer/ModalFileTransfer";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {HTMLRenderer} from "tc-shared/ui/react-elements/HTMLRenderer";
import {ProgressBar} from "tc-shared/ui/react-elements/ProgressBar";
import {
    TransferProgress,
} from "tc-shared/file/Transfer";
import {tra} from "tc-shared/i18n/localize";
import {format_time, network} from "tc-shared/ui/frames/chat";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {Button} from "tc-shared/ui/react-elements/Button";

const cssStyle = require("./TransferInfo.scss");
const iconArrow = require("./icon_double_arrow.svg");
const iconTransferUpload = require("./icon_transfer_upload.svg");
const iconTransferDownload = require("./icon_transfer_download.svg");

export interface TransferInfoEvents {
    query_transfers: {},
    query_transfer_result: {
        status: "success" | "error" | "timeout";

        error?: string;
        transfers?: TransferInfoData[],
        showFinished?: boolean
    }

    action_toggle_expansion: { visible: boolean },
    action_toggle_finished_transfers: { visible: boolean },
    action_remove_finished: {},

    notify_transfer_registered: { transfer: TransferInfoData },
    notify_transfer_status: {
        id: number,
        status: TransferStatus,
        error?: string
    },
    notify_transfer_progress: {
        id: number;
        status: TransferStatus,
        progress: TransferProgress
    },

    notify_modal_closed: {}
}

export interface TransferInfoData {
    id: number;

    direction: "upload" | "download";
    status: TransferStatus;

    name: string;
    path: string;

    progress: number;
    error?: string;

    timestampRegistered: number;
    timestampBegin: number;
    timestampEnd: number;

    transferredBytes: number;
}

const ExpendState = (props: { extended: boolean, events: Registry<TransferInfoEvents>}) => {
    const [expended, setExpended] = useState(props.extended);

    props.events.reactUse("action_toggle_expansion", event => setExpended(event.visible));
    return <div className={cssStyle.expansionContainer + (expended ? " " + cssStyle.expended : "")} onClick={() => props.events.fire("action_toggle_expansion", { visible: !expended })}>
        <HTMLRenderer purify={false}>{iconArrow}</HTMLRenderer>
    </div>;
};

const ToggleFinishedTransfersCheckbox = (props: { events: Registry<TransferInfoEvents> }) => {
    const ref = useRef<Checkbox>(null);
    const [state, setState] = useState({ disabled: true, checked: false });
    props.events.reactUse("action_toggle_finished_transfers", event => {
        setState({
            checked: event.visible,
            disabled: false
        });
        ref.current?.setState({
            checked: event.visible,
            disabled: false
        });
    });

    props.events.reactUse("query_transfer_result", event => {
        if(event.status !== "success")
            return;

        setState({
            checked: event.showFinished,
            disabled: false
        });
        ref.current?.setState({
            checked: event.showFinished,
            disabled: false
        });
    });

    return (
        <Checkbox
            ref={ref}
            initialValue={state.checked}
            disabled={state.disabled}
            onChange={state => props.events.fire("action_toggle_finished_transfers", { visible: state })}
            label={<Translatable>Show finished transfers</Translatable>} />
    );
};

@ReactEventHandler<RunningTransfersInfo>(e => e.props.events)
class RunningTransfersInfo extends React.Component<{ events: Registry<TransferInfoEvents> }, { state: "error" | "querying" | "normal" }> {
    private runningTransfers: { transfer: TransferInfoData, progress: TransferProgress | undefined }[] = [];

    constructor(props) {
        super(props);

        this.state = {
            state: "querying"
        };
    }

    private currentStatistic() {
        const progress = this.runningTransfers.map(e => e.progress).filter(e => !!e);
        return {
            totalBytes: progress.map(e => e.file_total_size).reduce((a, b) => a + b, 0),
            currentOffset: progress.map(e => e.file_current_offset).reduce((a, b) => a + b, 0),
            speed: progress.map(e => e.network_current_speed).reduce((a, b) => a + b, 0)
        }
    }

    render() {
        if(this.state.state === "querying") {
            return (
                <div key={"querying"} className={cssStyle.overlay + " " + cssStyle.querying}>
                    <a><Translatable>loading</Translatable> <LoadingDots maxDots={3} /></a>
                </div>
            );
        } else if(this.state.state === "error") {
            return (
                <div key={"query-error"} className={cssStyle.overlay + " " + cssStyle.error}>
                    <a><Translatable>query error</Translatable></a>
                </div>
            );
        } else if(this.runningTransfers.length === 0) {
            return (
                <div key={"no-transfers"} className={cssStyle.overlay + " " + cssStyle.noTransfers}>
                    <a><Translatable>No running transfers</Translatable></a>
                </div>
            );
        }

        const stats = this.currentStatistic();
        const totalBytes = network.format_bytes(stats.totalBytes, { unit: "B", time: "", exact: false });
        const currentOffset = network.format_bytes(stats.currentOffset, { unit: "B", time: "", exact: false });
        const speed = network.format_bytes(stats.speed, { unit: "B", time: "second", exact: false });

        return (
            <div key={"running-transfers"} className={cssStyle.overlay + " " + cssStyle.runningTransfers}>
                <ProgressBar value={stats.currentOffset * 100 / stats.totalBytes} type={"normal"} text={tra("Transferred {0} out of {1} total bytes ({2})", currentOffset, totalBytes, speed)} />
            </div>
        );
    }

    @EventHandler<TransferInfoEvents>("query_transfers")
    private handleQueryTransfers() {
        this.setState({ state: "querying" });
    }

    @EventHandler<TransferInfoEvents>("query_transfer_result")
    private handleQueryTransferResult(event: TransferInfoEvents["query_transfer_result"]) {
        this.setState({
            state: event.status !== "success" ? "error" : "normal"
        });

        this.runningTransfers = (event.transfers || []).filter(e => e.status !== "finished" && e.status !== "errored").map(e => {
            return {
                progress: undefined,
                transfer: e
            }
        });
    }

    @EventHandler<TransferInfoEvents>("notify_transfer_registered")
    private handleTransferRegistered(event: TransferInfoEvents["notify_transfer_registered"]) {
        this.runningTransfers.push({ transfer: event.transfer, progress: undefined });
        this.forceUpdate();
    }

    @EventHandler<TransferInfoEvents>("notify_transfer_status")
    private handleTransferStatus(event: TransferInfoEvents["notify_transfer_status"]) {
        const index = this.runningTransfers.findIndex(e => e.transfer.id === event.id);
        if(index === -1) return;

        if(event.status === "finished" || event.status === "errored")
            this.runningTransfers.splice(index, 1);
        this.forceUpdate();
    }

    @EventHandler<TransferInfoEvents>("notify_transfer_progress")
    private handleTransferProgress(event: TransferInfoEvents["notify_transfer_progress"]) {
        const index = this.runningTransfers.findIndex(e => e.transfer.id === event.id);
        if(index === -1) return;

        this.runningTransfers[index].progress = event.progress;
        this.forceUpdate();
    }
}

const BottomTransferInfo = (props: { events: Registry<TransferInfoEvents> }) => {
    const [extendedInfo, setExtendedInfo] = useState(false);

    props.events.reactUse("action_toggle_expansion", event => setExtendedInfo(event.visible));

    return (
        <div className={cssStyle.info}>
            <RunningTransfersInfo events={props.events} />
            <div className={cssStyle.overlay + (extendedInfo ? "" : " " + cssStyle.hidden) + " " + cssStyle.extended} >
                <ToggleFinishedTransfersCheckbox events={props.events} />
            </div>
        </div>
    )
};

const BottomBar = (props: { events: Registry<TransferInfoEvents> }) => (
    <div className={cssStyle.bottomContainer}>
        <BottomTransferInfo events={props.events} />
        <ExpendState extended={false} events={props.events} />
    </div>
);

const TransferEntry = (props: { transfer: TransferInfoData, events: Registry<TransferInfoEvents>, finishedShown: boolean }) => {
    const [finishedShown, setFinishedShown] = useState(props.finishedShown);
    const [transferState, setTransferState] = useState<TransferStatus>(props.transfer.status);
    const [finishAnimationFinished, setFinishAnimationFinished] = useState(props.transfer.status === "finished" || props.transfer.status === "errored");

    const progressBar = useRef<ProgressBar>(null);

    const progressBarText = (status: TransferStatus, info?: TransferProgress) => {
        switch (status) {
            case "errored":
                return props.transfer.error ? tr("file transfer failed: ") + props.transfer.error : tr("file transfer failed");

            case "finished":
                const neededTime = format_time(props.transfer.timestampEnd - props.transfer.timestampBegin, tr("less than a second"));
                const totalBytes = network.format_bytes(props.transfer.transferredBytes, { unit: "B", time: "", exact: false });
                const speed = network.format_bytes(props.transfer.transferredBytes * 1000 / Math.max(props.transfer.timestampEnd - props.transfer.timestampBegin, 1000), { unit: "B", time: "second", exact: false });
                return tra("transferred {0} in {1} ({2})", totalBytes, format_time(props.transfer.timestampEnd - props.transfer.timestampBegin, neededTime), speed);

            case "pending":
                return tr("pending");

            case "none":
                return tr("invalid state!");

            case "transferring": {
                if(!info) {
                    return tr("awaiting info");
                }

                const currentBytes = network.format_bytes(info.file_current_offset, { unit: "B", time: "", exact: false });
                const totalBytes = network.format_bytes(info.file_total_size, { unit: "B", time: "", exact: false });
                const speed = network.format_bytes(info.network_current_speed, { unit: "B", time: "second", exact: false });

                return tra("transferred {0} out of {1} ({2})", currentBytes, totalBytes, speed);
            }
        }
        return "";
    };

    const progressBarMode = (status: TransferStatus) => {
        switch (status) {
            case "errored":
                return "error";
            case "finished":
                return "success";
            default:
                return "normal";
        }
    };

    props.events.reactUse("notify_transfer_status", event => {
        if(event.id !== props.transfer.id)
            return;

        setTransferState(event.status);
        if(!progressBar.current)
            return;

        const pbState = {
            text: progressBarText(event.status),
            type: progressBarMode(event.status)
        } as any;

        if(event.status === "errored" || event.status === "finished") {
            pbState.value = 100;

        } else if(event.status === "none" || event.status === "pending")
            pbState.value = 0;

        progressBar.current.setState(pbState);
    });

    props.events.reactUse("notify_transfer_progress", event => {
        if(event.id !== props.transfer.id || !progressBar.current)
            return;

        const pb = progressBar.current;
        pb.setState({
            text: progressBarText(event.status, event.progress),
            type: progressBarMode(event.status),
            value: event.status === "errored" || event.status === "finished" ? 100 : event.status === "pending" || event.status === "none" ? 0 : (event.progress.file_current_offset / event.progress.file_total_size) * 100
        });
    });

    props.events.reactUse("action_toggle_finished_transfers", event => setFinishedShown(event.visible));

    useEffect(() => {
        if(finishAnimationFinished)
            return;
        if(transferState !== "finished" && transferState !== "errored")
            return;

        const id = setTimeout(() => setFinishAnimationFinished(true), 1500);
        return () => clearTimeout(id);
    });

    let hidden = transferState === "finished" || transferState === "errored" ? !finishedShown && finishAnimationFinished : false;
    return <div className={cssStyle.transferEntryContainer + (hidden ? " " + cssStyle.hidden : "")}>
        <div className={cssStyle.transferEntry}>
            <div className={cssStyle.image}>
                <HTMLRenderer purify={false}>{props.transfer.direction === "upload" ? iconTransferUpload : iconTransferDownload}</HTMLRenderer>
            </div>
            <div className={cssStyle.info}>
                <a className={cssStyle.name}>{props.transfer.name}</a>
                <a className={cssStyle.path}>{props.transfer.path}</a>
                <div className={cssStyle.status}>
                    <ProgressBar ref={progressBar} value={props.transfer.progress * 100} type={progressBarMode(transferState)} text={progressBarText(transferState)} />
                </div>
            </div>
        </div>
    </div>
};

@ReactEventHandler<TransferList>(e => e.props.events)
class TransferList extends React.PureComponent<{ events: Registry<TransferInfoEvents> }, { state: "loading" | "error" | "normal", error?: string }> {
    private transfers: TransferInfoData[] = [];
    private showFinishedTransfers: boolean = true;

    constructor(props) {
        super(props);

        this.state = {
            state: "loading"
        }
    }

    render() {
        const entries = [];

        if(this.state.state === "error") {
            entries.push(<div key={"query-error"} className={cssStyle.queryError}><a><Translatable>Failed to query the file transfers:</Translatable><br/>{this.state.error}</a></div>);
        } else if(this.state.state === "loading") {
            entries.push(<div key={"loading"} className={cssStyle.querying}><a><Translatable>loading</Translatable> <LoadingDots maxDots={3}/></a></div>);
        } else {
            this.transfers.forEach(e => {
                entries.push(<TransferEntry finishedShown={this.showFinishedTransfers} key={"transfer-" + e.id} transfer={e} events={this.props.events} />);
            });
            entries.push(<div key={"no-transfers"} className={cssStyle.noTransfers}><a><Translatable>No transfers</Translatable></a></div>);
        }

        return (
            <div className={cssStyle.list}>{entries}</div>
        );
    }

    componentDidMount(): void {
        this.props.events.fire("query_transfers");
    }

    @EventHandler<TransferInfoEvents>("action_toggle_finished_transfers")
    private handleToggleFinishedTransfers(event: TransferInfoEvents["action_toggle_finished_transfers"]) {
        this.showFinishedTransfers = event.visible;
    }


    @EventHandler<TransferInfoEvents>("action_remove_finished")
    private handleRemoveFinishedTransfers() {
        this.transfers = this.transfers.filter(e => e.status !== "finished" && e.status !== "errored");
        this.forceUpdate();
    }

    @EventHandler<TransferInfoEvents>("query_transfers")
    private handleQueryTransfers() {
        this.setState({ state: "loading" });
    }

    @EventHandler<TransferInfoEvents>("query_transfer_result")
    private handleQueryTransferResult(event: TransferInfoEvents["query_transfer_result"]) {
        this.setState({
            state: event.status === "success" ? "normal" : "error",
            error: event.status === "timeout" ? tr("Request timed out") : event.error || tr("unknown error")
        });
        if(event.status === "success")
            this.showFinishedTransfers = event.showFinished;

        this.transfers = event.transfers || [];
        this.transfers.sort((a, b) => b.timestampRegistered - a.timestampRegistered);
    }

    @EventHandler<TransferInfoEvents>("notify_transfer_registered")
    private handleTransferRegistered(event: TransferInfoEvents["notify_transfer_registered"]) {
        this.transfers.splice(0, 0, event.transfer);
        this.forceUpdate();
    }

    @EventHandler<TransferInfoEvents>("notify_transfer_status")
    private handleTransferStatus(event: TransferInfoEvents["notify_transfer_status"]) {
        const transfer = this.transfers.find(e => e.id === event.id);
        if(!transfer) return;

        switch (event.status) {
            case "finished":
            case "errored":
            case "none":
                transfer.timestampEnd = Date.now();
                break;

            case "transferring":
                if(transfer.timestampBegin === 0)
                    transfer.timestampBegin = Date.now();
        }
        transfer.status = event.status;
        transfer.error = event.error;
    }

    @EventHandler<TransferInfoEvents>("notify_transfer_progress")
    private handleTransferProgress(event: TransferInfoEvents["notify_transfer_progress"]) {
        const transfer = this.transfers.find(e => e.id === event.id);
        if(!transfer) return;

        transfer.progress = event.progress.file_current_offset / event.progress.file_total_size;
        transfer.status = event.status;
        transfer.transferredBytes = event.progress.file_bytes_transferred;
    }
}

const ExtendedInfo = (props: { events: Registry<TransferInfoEvents> }) => {
    const [expended, setExpended] = useState(false);
    const [finishedShown, setFinishedShown] = useState(true);

    props.events.reactUse("action_toggle_expansion", event => setExpended(event.visible));
    props.events.reactUse("action_toggle_finished_transfers", event => setFinishedShown(event.visible));
    props.events.reactUse("query_transfer_result", event => event.status === "success" && setFinishedShown(event.showFinished));

    return <div className={cssStyle.expendedContainer + (expended ? "" : " " + cssStyle.hidden)} >
        <div className={cssStyle.header}>
            <a>{finishedShown ? <Translatable key={"file-transfers"}>File transfers</Translatable> : <Translatable key={"running-file-transfers"}>Running file transfers</Translatable>}</a>
            <Button disabled={!finishedShown} color={"blue"} onClick={() => props.events.fire("action_remove_finished")}><Translatable>Remove finished</Translatable></Button>
        </div>
        <TransferList events={props.events} />
    </div>;
};

export const TransferInfo = (props: { events: Registry<TransferInfoEvents> }) => (
    <div className={cssStyle.container} >
        <ExtendedInfo events={props.events} />
        <BottomBar events={props.events} />
    </div>
);