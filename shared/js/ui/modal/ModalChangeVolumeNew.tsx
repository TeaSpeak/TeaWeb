import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import * as React from "react";
import {Slider} from "tc-shared/ui/react-elements/Slider";
import {Button} from "tc-shared/ui/react-elements/Button";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import {ClientEntry, MusicClientEntry} from "tc-shared/tree/Client";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
const cssStyle = require("./ModalChangeVolume.scss");

export interface VolumeChangeEvents {
    "change-volume": {
        newValue: number,
        origin: "user-input" | "reset" | "unknown"
    }

    "query-volume": {},
    "query-volume-response": {
        volume: number
    }


    "apply-volume": {
        newValue: number,
        origin: "user-input" | "reset" | "unknown"
    },
    "apply-volume-result": {
        newValue: number,
        success: boolean
    },

    "close-modal": {}
}

interface VolumeChangeModalState {
    state: "querying" | "applying" | "user-input";

    volumeModifier: number;
    sliderValue: number;
}

@ReactEventHandler(e => e.props.events)
class VolumeChangeModal extends React.Component<{ clientName: string, maxVolume?: number, remote: boolean, events: Registry<VolumeChangeEvents> }, VolumeChangeModalState> {
    private readonly refSlider = React.createRef<Slider>();

    private originalValue: number;
    constructor(props) {
        super(props);

        this.state = {
            volumeModifier: 1,
            sliderValue: 100,
            state: "querying"
        };
    }

    componentDidMount(): void {
        this.props.events.fire("query-volume");
    }

    render() {
        const db = Math.log2(this.state.volumeModifier) * 10;
        let valueString = db.toFixed(1) + "db";
        if(!valueString.startsWith("-") && valueString !== "0") valueString = "+" + valueString;

        return (
            <div className={cssStyle.container}>
                <div className={cssStyle.info}>
                    <a>Change value for client {this.props.clientName}</a>
                </div>
                <div className={cssStyle.sliderContainer}>
                    <Slider
                        minValue={0}
                        maxValue={200}
                        stepSize={1}

                        className={cssStyle.slider}
                        tooltip={() => valueString}

                        onInput={value => this.onValueChanged(value)}

                        value={this.state.sliderValue}
                        disabled={this.state.state !== "user-input"}

                        ref={this.refSlider}
                    />
                    <a className={cssStyle.value}>{valueString}</a>
                </div>
                <div className={cssStyle.buttons}>
                    <Button type={"small"} color={"blue"} className={cssStyle.reset} onClick={() => this.onResetClicked()} disabled={this.state.state !== "user-input" || this.state.sliderValue === 100}>
                        <Translatable>Reset</Translatable>
                    </Button>
                    <Button type={"small"} color={"green"} className={cssStyle.apply} onClick={() => this.onApplyClick()} hidden={!this.props.remote} disabled={this.state.state !== "user-input" || this.originalValue === this.state.volumeModifier}>
                        <Translatable>Apply</Translatable>
                    </Button>
                    <Button type={"small"} color={"red"} className={cssStyle.cancel} onClick={() => this.onCancelClick()}>
                        <Translatable>Cancel</Translatable>
                    </Button>
                    <Button type={"small"} color={"green"} className={cssStyle.ok} onClick={() => this.onOkClick()}>
                        <Translatable>Ok</Translatable>
                    </Button>
                </div>
            </div>
        );
    }

    private static slider2value(target: number) {
        if(target > 100) {
            /* between +0db and +20db */
            const value = (target - 100) * 20 / 100;
            return Math.pow(2, value / 10);
        } else if(target < 100) {
            /* between -30db and +0db */
            const value = 30 - target * 30 / 100;
            return Math.pow(2, -value / 10);
        } else {
            return 1;
        }
    }

    private static value2slider(value: number) {
        const db = Math.log2(value) * 10;
        if(db > 0) {
            return 100 + db * 100 / 20;
        } else if(db < 0) {
            return 100 + db * 100 / 30; /* db is negative */
        } else {
            return 100;
        }
    }

    private onValueChanged(target: number) {
        this.props.events.fire("change-volume", {
            newValue: VolumeChangeModal.slider2value(target),
            origin: "user-input"
        });
    }

    private onResetClicked() {
        this.props.events.fire("change-volume", { newValue: 1, origin: "reset" });
    }

    private onApplyClick() {
        this.props.events.fire("apply-volume", {
            newValue: this.state.volumeModifier,
            origin: "user-input"
        });
    }

    private onCancelClick() {
        this.props.events.fire("change-volume", { origin: "user-input", newValue: this.originalValue });
        this.props.events.fire("close-modal");
    }

    private onOkClick() {
        if(this.props.remote && this.state.volumeModifier !== this.originalValue)
            this.props.events.fire("apply-volume", { origin: "user-input", newValue: this.originalValue });
        this.props.events.fire("close-modal");
    }

    @EventHandler<VolumeChangeEvents>("change-volume")
    private handleVolumeChanged(event: VolumeChangeEvents["change-volume"]) {
        const sliderValue = VolumeChangeModal.value2slider(event.newValue);
        this.setState({
            volumeModifier: event.newValue,
            sliderValue: sliderValue
        });

        if(event.origin !== "user-input")
            this.refSlider.current?.setState({ value: sliderValue });
    }

    @EventHandler<VolumeChangeEvents>("query-volume")
    private handleVolumeQuery() {
        this.setState({
            state: "querying"
        });

        this.refSlider.current?.setState({
            disabled: true
        });
    }

    @EventHandler<VolumeChangeEvents>("apply-volume")
    private handleApplyVolume() {
        this.setState({
            state: "applying"
        });

        this.refSlider.current?.setState({
            disabled: true
        });
    }

    @EventHandler<VolumeChangeEvents>("query-volume-response")
    private handleVolumeQueryResponse(event: VolumeChangeEvents["query-volume-response"]) {
        const sliderValue = VolumeChangeModal.value2slider(event.volume);
        this.setState({
            volumeModifier: event.volume,
            sliderValue: sliderValue,
            state: "user-input"
        });

        this.refSlider.current?.setState({
            value: sliderValue,
            disabled: false
        });

        this.originalValue = event.volume;
    }

    @EventHandler<VolumeChangeEvents>("apply-volume-result")
    private handleApplyVolumeResult(event: VolumeChangeEvents["apply-volume-result"]) {
        const sliderValue = VolumeChangeModal.value2slider(event.newValue);
        this.setState({
            volumeModifier: event.newValue,
            sliderValue: sliderValue,
            state: "user-input"
        });

        this.refSlider.current?.setState({
            value: sliderValue,
            disabled: false
        });

        this.originalValue = event.newValue;
    }
}

export function spawnClientVolumeChange(client: ClientEntry) {
    const events = new Registry<VolumeChangeEvents>();

    events.on("query-volume", () => {
        events.fire_async("query-volume-response", {
            volume: client.getAudioVolume()
        });
    });
    events.on("change-volume", event => {
        client.setAudioVolume(event.newValue);
    });

    const modal = spawnReactModal(class extends InternalModal {
        constructor() {
            super();
        }

        renderBody() {
            return <VolumeChangeModal remote={false} clientName={client.clientNickName()} events={events} />;
        }

        title() {
            return <Translatable>Change local volume</Translatable>;
        }
    });

    events.on("close-modal", event => modal.destroy());
    modal.show();
    return modal;
}

export function spawnMusicBotVolumeChange(client: MusicClientEntry, maxValue: number) {
    //FIXME: Max value!
    const events = new Registry<VolumeChangeEvents>();

    events.on("query-volume", () => {
        events.fire_async("query-volume-response", {
            volume: client.properties.player_volume
        });
    });
    events.on("apply-volume", event => {
        client.channelTree.client.serverConnection.send_command("clientedit", {
            clid: client.clientId(),
            player_volume: event.newValue,
        }).then(() => {
            events.fire("apply-volume-result", { newValue: client.properties.player_volume, success: true });
        }).catch(() => {
            events.fire("apply-volume-result", { newValue: client.properties.player_volume, success: false });
        });
    });

    const modal = spawnReactModal(class extends InternalModal {
        constructor() {
            super();
        }

        renderBody() {
            return <VolumeChangeModal remote={true} clientName={client.clientNickName()} maxVolume={maxValue} events={events} />;
        }

        title() {
            return <Translatable>Change remote volume</Translatable>;
        }
    });

    events.on("close-modal", event => modal.destroy());
    modal.show();
    return modal;
}