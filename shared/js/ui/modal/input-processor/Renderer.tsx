import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext, useState} from "react";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {IpcRegistryDescription, Registry} from "tc-events";
import {ModalInputProcessorEvents, ModalInputProcessorVariables} from "tc-shared/ui/modal/input-processor/Definitios";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {InputProcessorStatistics} from "tc-shared/voice/RecorderBase";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {ControlledBoxedInputField, ControlledSelect} from "tc-shared/ui/react-elements/InputField";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {traj} from "tc-shared/i18n/localize";

const cssStyle = require("./Renderer.scss");
const EventContext = React.createContext<Registry<ModalInputProcessorEvents>>(undefined);
const VariableContext = React.createContext<UiVariableConsumer<ModalInputProcessorVariables>>(undefined);
const StatisticsContext = React.createContext<InputProcessorStatistics>(undefined);

const TablePropertiesHead = React.memo(() => (
    <div className={cssStyle.tableEntry + " " + cssStyle.tableHeader}>
        <div className={joinClassList(cssStyle.column, cssStyle.name)}>
            <div className={cssStyle.header}>
                <Translatable>Property</Translatable>
            </div>
        </div>
        <div className={joinClassList(cssStyle.column, cssStyle.value)}>
            <div className={cssStyle.header}>
                <Translatable>Value</Translatable>
            </div>
        </div>
    </div>
));

type PropertyType = {
    type: "integer" | "float" | "boolean"
} | {
    type: "select",
    values: string[]
};

const PropertyValueBooleanRenderer = React.memo((props: { property: keyof ModalInputProcessorVariables }) => {
    const variables = useContext(VariableContext);
    const value = variables.useVariable(props.property);

    if(value.status === "loading") {
        return null;
    } else {
        return (
            <Checkbox
                value={value.localValue as any}
                disabled={value.status !== "loaded"}
                onChange={newValue => value.setValue(newValue)}
            />
        );
    }
});

const PropertyValueNumberRenderer = React.memo((props: { property: keyof ModalInputProcessorVariables }) => {
    const variables = useContext(VariableContext);
    const value = variables.useVariable(props.property);

    if(value.status === "loading") {
        return null;
    } else {
        return (
            <ControlledBoxedInputField
                className={cssStyle.containerInput}
                type={"number"}
                value={value.localValue as any}

                onChange={newValue => value.setValue(newValue as any, true)}
                onBlur={() => {
                    const targetValue = parseFloat(value.localValue as any);
                    if(isNaN(targetValue)) {
                        value.setValue(value.remoteValue, true);
                    } else {
                        value.setValue(targetValue, false);
                    }
                }}
                finishOnEnter={true}
            />
        );
    }
});

const PropertyValueSelectRenderer = React.memo((props: { property: keyof ModalInputProcessorVariables, options: string[] }) => {
    const variables = useContext(VariableContext);
    const value = variables.useVariable(props.property);

    if(value.status === "loading") {
        return null;
    } else {
        const index = props.options.indexOf(value.localValue as any);
        return (
            <ControlledSelect
                className={cssStyle.containerInput}
                type={"boxed"}

                value={index === -1 ? "local-value" : index.toString()}
                disabled={value.status !== "loaded"}
                onChange={event => {
                    const targetIndex = parseInt(event.target.value);
                    if(isNaN(targetIndex)) {
                        return;
                    }

                    value.setValue(props.options[targetIndex]);
                }}
            >
                <option key={"empty"} style={{ display: "none" }}/>
                <option key={"local-value"} style={{ display: "none" }}>{value.localValue}</option>
                {props.options.map((option, index) => (
                    <option key={"option_" + index} value={index}>{option}</option>
                )) as any}
            </ControlledSelect>
        );
    }
});

const TablePropertyValue = React.memo((props: { property: keyof ModalInputProcessorVariables, type: PropertyType }) => {
    const variables = useContext(VariableContext);
    const filter = variables.useReadOnly("propertyFilter", undefined, undefined);
    if(typeof filter === "string" && filter.length > 0) {
        const key = props.property as string;
        if(key.toLowerCase().indexOf(filter) === -1) {
            return null;
        }
    }

    let value;
    switch (props.type.type) {
        case "integer":
        case "float":
            value = <PropertyValueNumberRenderer property={props.property} key={"number"} />;
            break;

        case "boolean":
            value = <PropertyValueBooleanRenderer property={props.property} key={"boolean"} />;
            break;

        case "select":
            value = <PropertyValueSelectRenderer options={props.type.values} property={props.property} key={"select"} />;
            break;
    }

    return (
        <div className={cssStyle.tableEntry}>
            <div className={joinClassList(cssStyle.column, cssStyle.name)}>
                <div className={cssStyle.text}>{props.property}</div>
            </div>
            <div className={joinClassList(cssStyle.column, cssStyle.value)}>
                {value}
            </div>
        </div>
    );
});

const PropertyFilter = React.memo(() => {
    const variables = useContext(VariableContext);
    const filter = variables.useVariable("propertyFilter");

    return (
        <div className={cssStyle.containerFilter}>
            <ControlledBoxedInputField
                disabled={filter.status === "loading"}
                onChange={newValue => filter.setValue(newValue)}
                value={filter.localValue}
                placeholder={useTr("Filter")}
            />
        </div>
    )
});

const Properties = React.memo(() => {
    return (
        <div className={cssStyle.containerProperties}>
            <div className={cssStyle.title}>
                <Translatable>Properties</Translatable>
            </div>
            <div className={cssStyle.note}>
                <Translatable>Note: All changes are temporary and will be reset on the next restart.</Translatable>
            </div>
            <div className={cssStyle.table}>
                <TablePropertiesHead />
                <div className={cssStyle.tableBody}>
                    <TablePropertyValue property={"pipeline.maximum_internal_processing_rate"} type={{ type: "float" }} />
                    <TablePropertyValue property={"pipeline.multi_channel_render"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"pipeline.multi_channel_capture"} type={{ type: "boolean" }} />

                    <TablePropertyValue property={"pre_amplifier.enabled"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"pre_amplifier.fixed_gain_factor"} type={{ type: "float" }} />

                    <TablePropertyValue property={"high_pass_filter.enabled"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"high_pass_filter.apply_in_full_band"} type={{ type: "boolean" }} />

                    <TablePropertyValue property={"echo_canceller.enabled"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"echo_canceller.mobile_mode"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"echo_canceller.export_linear_aec_output"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"echo_canceller.enforce_high_pass_filtering"} type={{ type: "boolean" }} />

                    <TablePropertyValue property={"noise_suppression.enabled"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"noise_suppression.level"} type={{
                        type: "select",
                        values: ["low", "moderate", "high", "very-high"]
                    }} />
                    <TablePropertyValue property={"noise_suppression.analyze_linear_aec_output_when_available"} type={{ type: "boolean" }} />

                    <TablePropertyValue property={"transient_suppression.enabled"} type={{ type: "boolean" }} />

                    <TablePropertyValue property={"voice_detection.enabled"} type={{ type: "boolean" }} />

                    <TablePropertyValue property={"gain_controller1.enabled"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"gain_controller1.mode"} type={{
                        type: "select",
                        values: ["adaptive-analog", "adaptive-digital", "fixed-digital"]
                    }} />
                    <TablePropertyValue property={"gain_controller1.target_level_dbfs"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller1.compression_gain_db"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller1.enable_limiter"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"gain_controller1.analog_level_minimum"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller1.analog_level_maximum"} type={{ type: "float" }} />

                    <TablePropertyValue property={"gain_controller1.analog_gain_controller.enabled"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"gain_controller1.analog_gain_controller.startup_min_volume"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller1.analog_gain_controller.clipped_level_min"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller1.analog_gain_controller.enable_agc2_level_estimator"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"gain_controller1.analog_gain_controller.enable_digital_adaptive"} type={{ type: "boolean" }} />

                    <TablePropertyValue property={"gain_controller2.enabled"} type={{ type: "boolean" }} />

                    <TablePropertyValue property={"gain_controller2.fixed_digital.gain_db"} type={{ type: "float" }} />

                    <TablePropertyValue property={"gain_controller2.adaptive_digital.enabled"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"gain_controller2.adaptive_digital.vad_probability_attack"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller2.adaptive_digital.level_estimator"} type={{
                        type: "select",
                        values: ["rms", "peak"]
                    }} />
                    <TablePropertyValue property={"gain_controller2.adaptive_digital.level_estimator_adjacent_speech_frames_threshold"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller2.adaptive_digital.use_saturation_protector"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"gain_controller2.adaptive_digital.initial_saturation_margin_db"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller2.adaptive_digital.extra_saturation_margin_db"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller2.adaptive_digital.gain_applier_adjacent_speech_frames_threshold"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller2.adaptive_digital.max_gain_change_db_per_second"} type={{ type: "float" }} />
                    <TablePropertyValue property={"gain_controller2.adaptive_digital.max_output_noise_level_dbfs"} type={{ type: "float" }} />

                    <TablePropertyValue property={"residual_echo_detector.enabled"} type={{ type: "boolean" }} />
                    <TablePropertyValue property={"level_estimation.enabled"} type={{ type: "boolean" }} />

                    <TablePropertyValue property={"rnnoise.enabled"} type={{ type: "boolean" }} />
                </div>
            </div>
            <PropertyFilter />
        </div>
    )
})

const StatisticValue = React.memo((props: { statisticKey: keyof InputProcessorStatistics }) => {
    const statistics = useContext(StatisticsContext);

    let value;
    switch(statistics ? typeof statistics[props.statisticKey] : "undefined") {
        case "number":
            value = statistics[props.statisticKey].toPrecision(4);
            break;

        case "boolean":
            value = statistics[props.statisticKey] ? (
                <Translatable key={"true"}>true</Translatable>
            ) : (
                <Translatable key={"false"}>false</Translatable>
            );
            break;

        case "string":
            value = statistics[props.statisticKey];
            break;

        default:
            value = (
                <div className={cssStyle.unset}>
                    <Translatable>unset</Translatable>
                </div>
            );
            break;
    }

    return value;
});

const Statistic = React.memo((props: { statisticKey: keyof InputProcessorStatistics, children }) => (
    <div className={cssStyle.statistic}>
        <div className={cssStyle.key}>
            {props.children}:
        </div>
        <div className={cssStyle.value}>
            <StatisticValue statisticKey={props.statisticKey} />
        </div>
    </div>
));

const StatisticsProvider = React.memo((props: { children }) => {
    const events = useContext(EventContext);
    const [ statistics, setStatistics ] = useState<InputProcessorStatistics>(() => {
        events.fire("query_statistics");
        return undefined;
    });

    events.reactUse("notify_statistics", event => setStatistics(event.statistics), undefined, []);

    return (
        <StatisticsContext.Provider value={statistics}>
            {props.children}
        </StatisticsContext.Provider>
    );
});

const Statistics = React.memo(() => (
    <StatisticsProvider>
        <div className={cssStyle.containerStatistics}>
            <div className={cssStyle.title}>
                <Translatable>Statistics</Translatable>
            </div>
            <div className={cssStyle.statistics}>
                <Statistic statisticKey={"output_rms_dbfs"}>
                    <Translatable>Output RMS (dbfs)</Translatable>
                </Statistic>

                <Statistic statisticKey={"voice_detected"}>
                    <Translatable>Voice detected</Translatable>
                </Statistic>

                <Statistic statisticKey={"echo_return_loss"}>
                    <Translatable>Echo return loss</Translatable>
                </Statistic>

                <Statistic statisticKey={"echo_return_loss_enhancement"}>
                    <Translatable>Echo return loss enchancement</Translatable>
                </Statistic>

                <Statistic statisticKey={"delay_median_ms"}>
                    <Translatable>Delay median (ms)</Translatable>
                </Statistic>

                <Statistic statisticKey={"delay_ms"}>
                    <Translatable>Delay (ms)</Translatable>
                </Statistic>

                <Statistic statisticKey={"delay_standard_deviation_ms"}>
                    <Translatable>Delay standard deviation (ms)</Translatable>
                </Statistic>

                <Statistic statisticKey={"divergent_filter_fraction"}>
                    <Translatable>Divergent filter fraction</Translatable>
                </Statistic>

                <Statistic statisticKey={"residual_echo_likelihood"}>
                    <Translatable>Residual echo likelihood</Translatable>
                </Statistic>

                <Statistic statisticKey={"residual_echo_likelihood_recent_max"}>
                    <Translatable>Residual echo likelihood (max)</Translatable>
                </Statistic>

                <Statistic statisticKey={"rnnoise_volume"}>
                    <Translatable>RNNoise volume</Translatable>
                </Statistic>
            </div>
        </div>
    </StatisticsProvider>
));

class Modal extends AbstractModal {
    private readonly events: Registry<ModalInputProcessorEvents>;
    private readonly variables: UiVariableConsumer<ModalInputProcessorVariables>;

    constructor(events: IpcRegistryDescription<ModalInputProcessorEvents>, variables: IpcVariableDescriptor<ModalInputProcessorVariables>) {
        super();

        this.events = Registry.fromIpcDescription(events);
        this.variables = createIpcUiVariableConsumer(variables);

        this.events.on("notify_apply_error", event => {
            createErrorModal(tr("Failed to apply changes"), traj("Failed to apply changes:{:br:}{}", event.message)).open();
        })
    }

    protected onDestroy() {
        super.onDestroy();

        this.events.destroy();
        this.variables.destroy();
    }

    renderBody(): React.ReactElement {
        return (
            <EventContext.Provider value={this.events}>
                <VariableContext.Provider value={this.variables}>
                    <div className={joinClassList(cssStyle.container, this.properties.windowed && cssStyle.windowed)}>
                        <Properties />
                        <Statistics />
                    </div>
                </VariableContext.Provider>
            </EventContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return <Translatable>Input processor properties</Translatable>;
    }

}

export default Modal;