import {UiVariableConsumer, UiVariableMap, UiVariableProvider} from "tc-shared/ui/utils/Variable";

class LocalUiVariableProvider<Variables extends UiVariableMap> extends UiVariableProvider<Variables> {
    private consumer: LocalUiVariableConsumer<Variables>;

    constructor() {
        super();
    }

    destroy() {
        super.destroy();
        this.consumer = undefined;
    }

    setConsumer(consumer: LocalUiVariableConsumer<Variables>) {
        this.consumer = consumer;
    }

    protected doSendVariable(variable: string, customData: any, value: any) {
        this.consumer.notifyRemoteVariable(variable, customData, value);
    }

    public doEditVariable(variable: string, customData: any, newValue: any): Promise<void> | void {
        return super.doEditVariable(variable, customData, newValue);
    }
}

class LocalUiVariableConsumer<Variables extends UiVariableMap> extends UiVariableConsumer<Variables> {
    private provider: LocalUiVariableProvider<Variables>;

    constructor(provider: LocalUiVariableProvider<Variables>) {
        super();

        this.provider = provider;
    }

    destroy() {
        super.destroy();
        this.provider = undefined;
    }

    protected doEditVariable(variable: string, customData: any, value: any): Promise<void> | void {
        return this.provider.doEditVariable(variable, customData, value);
    }

    protected doRequestVariable(variable: string, customData: any) {
        return this.provider.sendVariable(variable, customData);
    }

    public notifyRemoteVariable(variable: string, customData: any, value: any) {
        super.notifyRemoteVariable(variable, customData, value);
    }
}

export function createLocalUiVariables<Variables extends UiVariableMap>() : [UiVariableProvider<Variables>, UiVariableConsumer<Variables>] {
    const provider = new LocalUiVariableProvider();
    const consumer = new LocalUiVariableConsumer(provider);
    provider.setConsumer(consumer);
    return [provider as any, consumer as any];
}