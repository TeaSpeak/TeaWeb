import {
    InputProcessor,
    kInputProcessorConfigRNNoiseKeys,
    kInputProcessorConfigWebRTCKeys
} from "tc-shared/voice/RecorderBase";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {Registry} from "tc-events";
import {ModalInputProcessorEvents, ModalInputProcessorVariables} from "tc-shared/ui/modal/input-processor/Definitios";
import {createIpcUiVariableProvider, IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import _ from "lodash";
import {LogCategory, logError, logTrace} from "tc-shared/log";

class Controller {
    readonly events: Registry<ModalInputProcessorEvents>;
    readonly variables: IpcUiVariableProvider<ModalInputProcessorVariables>;

    private readonly processor: InputProcessor;
    private statisticsTask: number;

    private currentConfigRNNoise;
    private currentConfigWebRTC;
    private currentStatistics;

    private filter: string;

    constructor(processor: InputProcessor) {
        this.processor = processor;

        this.events = new Registry<ModalInputProcessorEvents>();
        this.variables = createIpcUiVariableProvider();

        this.filter = "";

        for(const key of kInputProcessorConfigRNNoiseKeys) {
            this.variables.setVariableProvider(key, () => this.currentConfigRNNoise[key]);
            this.variables.setVariableEditor(key, newValue => {
                if(this.currentConfigRNNoise[key] === newValue) {
                    return true;
                }

                try {
                    const update = {};
                    update[key] = newValue;
                    this.processor.applyProcessorConfig("rnnoise", update as any);
                } catch (error) {
                    logTrace(LogCategory.AUDIO, tr("Tried to apply rnnoise: %o"), this.currentConfigRNNoise);
                    this.sendApplyError(error);
                    return false;
                }

                this.currentConfigRNNoise[key] = newValue;
                return true;
            });
        }

        for(const key of kInputProcessorConfigWebRTCKeys) {
            this.variables.setVariableProvider(key, () => this.currentConfigWebRTC[key]);
            this.variables.setVariableEditor(key, newValue => {
                if(this.currentConfigWebRTC[key] === newValue) {
                    return true;
                }

                try {
                    const update = {};
                    update[key] = newValue;
                    this.processor.applyProcessorConfig("webrtc-processing", update as any);
                } catch (error) {
                    logTrace(LogCategory.AUDIO, tr("Tried to apply webrtc-processing: %o"), this.currentConfigWebRTC);
                    this.sendApplyError(error);
                    return false;
                }

                this.currentConfigWebRTC[key] = newValue;
                return true;
            });
        }

        this.variables.setVariableProvider("propertyFilter", () => this.filter);
        this.variables.setVariableEditor("propertyFilter", newValue => {
            this.filter = newValue;
        });

        this.currentConfigRNNoise = this.processor.getProcessorConfig("rnnoise");
        this.currentConfigWebRTC = this.processor.getProcessorConfig("webrtc-processing");

        this.events.on("query_statistics", () => this.sendStatistics(true));

        this.statisticsTask = setInterval(() => {
            this.sendStatistics(false);
        }, 250);
    }

    destroy() {
        clearInterval(this.statisticsTask);
        this.events.destroy();
        this.variables.destroy();
    }

    sendStatistics(force: boolean) {
        const statistics = this.processor.getStatistics();
        if(!force && _.isEqual(this.currentStatistics, statistics)) {
            return;
        }

        this.currentStatistics = statistics;
        this.events.fire_react("notify_statistics", { statistics: statistics });
    }

    sendApplyError(error: any) {
        if(error instanceof Error) {
            error = error.message;
        } else if(typeof error !== "string") {
            logError(LogCategory.AUDIO, tr("Failed to apply new processor config: %o"), error);
            error = tr("lookup the console");
        }

        this.events.fire("notify_apply_error", { message: error });
    }
}

export function spawnInputProcessorModal(processor: InputProcessor) {
    if(__build.target !== "client") {
        throw tr("only the native client supports such modal");
    }

    const controller = new Controller(processor);

    const modal = spawnModal("modal-input-processor", [
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription()
    ], {
        popoutable: true,
        popedOut: true
    });

    modal.getEvents().on("destroy", () => {
        controller.destroy();
    });
    modal.show().then(undefined);
}