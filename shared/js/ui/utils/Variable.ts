import {useEffect, useState} from "react";
import * as _ from "lodash";

/*
 * To deliver optimized performance, we only promisify the values we need.
 * If done so, we have the change to instantaneously load local values without needing
 * to rerender the ui.
 */

export type UiVariable = Transferable | undefined | null | number | string | object;
export type UiVariableMap = { [key: string]: any }; //UiVariable | Readonly<UiVariable>

type IfEquals<X, Y, A=X, B=never> =
    (<T>() => T extends X ? 1 : 2) extends
        (<T>() => T extends Y ? 1 : 2) ? A : B;

type WritableKeys<T> = {
    [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never>
}[keyof T];

type ReadonlyKeys<T> = {
    [P in keyof T]: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, never, P>
}[keyof T];

export type ReadonlyVariables<Variables extends UiVariableMap> = Pick<Variables, ReadonlyKeys<Variables>>
export type WriteableVariables<Variables extends UiVariableMap> = Pick<Variables, WritableKeys<Variables>>

type UiVariableEditor<Variables extends UiVariableMap, T extends keyof Variables> = Variables[T] extends { __readonly } ?
    never :
    (newValue: Variables[T], customData: any) => Variables[T] | void | boolean;

type UiVariableEditorPromise<Variables extends UiVariableMap, T extends keyof Variables> = Variables[T] extends { __readonly } ?
    never :
    (newValue: Variables[T], customData: any) => Promise<Variables[T] | void | boolean>;

export abstract class UiVariableProvider<Variables extends UiVariableMap> {
    private variableProvider: {[key: string]: (customData: any) => any | Promise<any>} = {};
    private variableEditor: {[key: string]: (newValue, customData: any) => any | Promise<any>} = {};

    protected constructor() { }

    destroy() { }

    setVariableProvider<T extends keyof Variables>(variable: T, provider: (customData: any) => Variables[T] | Promise<Variables[T]>) {
        this.variableProvider[variable as any] = provider;
    }

    setVariableEditor<T extends keyof Variables>(variable: T, editor: UiVariableEditor<Variables, T>) {
        this.variableEditor[variable as any] = editor;
    }

    setVariableEditorAsync<T extends keyof Variables>(variable: T, editor: UiVariableEditorPromise<Variables, T>) {
        this.variableEditor[variable as any] = editor;
    }

    /**
     * Send/update a variable
     * @param variable The target variable to send.
     * @param customData
     * @param forceSend If `true` the variable will be send event though it hasn't changed.
     */
    sendVariable<T extends keyof Variables>(variable: T, customData?: any, forceSend?: boolean) : void | Promise<void> {
        const providers = this.variableProvider[variable as any];
        if(!providers) {
            throw tra("missing provider for {}", variable);
        }

        const result = providers(customData);
        if(result instanceof Promise) {
            return result
                .then(result => this.doSendVariable(variable as any, customData, result))
                .catch(error => {
                    console.error(error);
                });
        } else {
            this.doSendVariable(variable as any, customData, result);
        }
    }

    async getVariable<T extends keyof Variables>(variable: T, customData?: any, ignoreCache?: boolean) : Promise<Variables[T]> {
        const providers = this.variableProvider[variable as any];
        if(!providers) {
            throw tra("missing provider for {}", variable);
        }

        const result = providers(customData);
        if(result instanceof Promise) {
            return await result;
        } else {
            return result;
        }
    }

    getVariableSync<T extends keyof Variables>(variable: T, customData?: any, ignoreCache?: boolean) : Variables[T] {
        const providers = this.variableProvider[variable as any];
        if(!providers) {
            throw tr("missing provider");
        }

        const result = providers(customData);
        if(result instanceof Promise) {
            throw tr("tried to get an async variable synchronous");
        }

        return result;
    }

    protected resolveVariable(variable: string, customData: any): Promise<any> | any {
        const providers = this.variableProvider[variable];
        if(!providers) {
            throw tr("missing provider");
        }

        return providers(customData);
    }

    protected doEditVariable(variable: string, customData: any, newValue: any) : Promise<void> | void {
        const editor = this.variableEditor[variable];
        if(!editor) {
            throw tr("variable is read only");
        }

        const handleEditResult = result => {
            if(typeof result === "undefined") {
                /* change succeeded, no need to notify any variable since the consumer already has the newest value */
            } else if(result === true || result === false) {
                /* The new variable has been accepted/rejected and the variable should be updated on the remote side. */
                /* TODO: Use cached value if the result is `false` */
                this.sendVariable(variable, customData, true);
            } else {
                /* The new value hasn't been accepted. Instead a new value has been returned. */
                this.doSendVariable(variable, customData, result);
            }
        }

        const handleEditError = error => {
            console.error("Failed to change variable %s: %o", variable, error);
            this.sendVariable(variable, customData, true);
        }

        try {
            let result = editor(newValue, customData);
            if(result instanceof Promise) {
                return result.then(handleEditResult).catch(handleEditError);
            } else {
                handleEditResult(result);
            }
        } catch (error) {
            handleEditError(error);
        }
    }

    protected abstract doSendVariable(variable: string, customData: any, value: any);
}

export type UiVariableStatus<Variables extends UiVariableMap, T extends keyof Variables> = {
    status: "loading",

    localValue: Variables[T] | undefined,
    remoteValue: undefined,

    /* Will do nothing */
    setValue: (newValue: Variables[T], localOnly?: boolean) => void
} | {
    status: "loaded" | "applying",

    localValue: Variables[T],
    remoteValue: Variables[T],

    setValue: (newValue: Variables[T], localOnly?: boolean) => void
};

export type UiReadOnlyVariableStatus<Variables extends UiVariableMap, T extends keyof Variables> = {
    status: "loading" | "loaded",
    value: Variables[T],
};

type UiVariableCacheEntry = {
    key: string,
    useCount: number,
    customData: any | undefined,
    currentValue: any | undefined,
    status: "loading" | "loaded" | "applying",
    updateListener: ((clearLocalValue: boolean) => void)[]
}

type LocalVariableValue = {
    status: "set" | "default",
    value: any
} | {
    status: "unset"
}

let staticRevisionId = 0;
export abstract class UiVariableConsumer<Variables extends UiVariableMap> {
    private variableCache: {[key: string]: UiVariableCacheEntry[]} = {};

    destroy() {
        this.variableCache = {};
    }

    private getOrCreateVariable<T extends keyof Variables>(
        variable: string,
        customData?: any
    ) : UiVariableCacheEntry {
        let cacheEntry = this.variableCache[variable]?.find(variable => _.isEqual(variable.customData, customData));
        if(!cacheEntry) {
            this.variableCache[variable] = this.variableCache[variable] || [];
            this.variableCache[variable].push(cacheEntry = {
                key: variable,
                customData,
                currentValue: undefined,
                status: "loading",
                useCount: 0,
                updateListener: []
            });

            /* Might already call notifyRemoteVariable */
            this.doRequestVariable(variable, customData);
        }
        return cacheEntry;
    }

    private derefVariable(variable: UiVariableCacheEntry) {
        if(--variable.useCount === 0) {
            const cache = this.variableCache[variable.key];
            if(!cache) {
                return;
            }

            cache.remove(variable);
            if(cache.length === 0) {
                delete this.variableCache[variable.key];
            }
        }
    }

    useVariable<T extends keyof WriteableVariables<Variables>>(
        variable: T,
        customData?: any,
        defaultValue?: Variables[T]
    ) : UiVariableStatus<Variables, T> {
        const haveDefaultValue = arguments.length >= 3;
        const cacheEntry = this.getOrCreateVariable(variable as string, customData);

        const [ localValue, setLocalValue ] = useState<LocalVariableValue>(() => {
            /* Variable constructor */
            cacheEntry.useCount++;

            if(cacheEntry.status === "loading") {
                return {
                    status: "set",
                    value: cacheEntry.currentValue
                };
            } else if(haveDefaultValue) {
                return {
                    status: "default",
                    value: defaultValue
                };
            } else {
                return {
                    status: "unset"
                };
            }
        });

        const [, setRemoteVersion ] = useState(0);

        useEffect(() => {
            /* Initial rendered */
            if(cacheEntry.status === "loaded" && localValue.status !== "set") {
                /* Update the local value to the current state */
                setLocalValue(cacheEntry.currentValue);
            }

            let listener;
            cacheEntry.updateListener.push(listener = clearLocalValue => {
                if(clearLocalValue) {
                    setLocalValue({ status: "unset" });
                }

                /* We can't just increment the old one by one since this update listener may fires twice before rendering */
                setRemoteVersion(++staticRevisionId);
            });

            return () => {
                cacheEntry.updateListener.remove(listener);
                this.derefVariable(cacheEntry);
            };
        }, []);

        if(cacheEntry.status === "loading") {
            return {
                status: "loading",
                localValue: localValue.status === "unset" ? undefined : localValue.value,
                remoteValue: undefined,
                setValue: () => {}
            };
        } else {
            return {
                status: cacheEntry.status,

                localValue: localValue.status === "set" ? localValue.value : cacheEntry.currentValue,
                remoteValue: cacheEntry.currentValue,

                setValue: (newValue, localOnly) => {
                    if(!localOnly && !_.isEqual(cacheEntry.currentValue, newValue)) {
                        const editingFinished = (succeeded: boolean) => {
                            if(cacheEntry.status !== "applying") {
                                /* A new value has already been emitted */
                                return;
                            }

                            cacheEntry.status = "loaded";
                            cacheEntry.currentValue = succeeded ? newValue : cacheEntry.currentValue;
                            cacheEntry.updateListener.forEach(callback => callback(true));
                        };

                        cacheEntry.status = "applying";
                        const result = this.doEditVariable(variable as string, customData, newValue);
                        if(result instanceof Promise) {
                            result
                                .then(() => editingFinished(true))
                                .catch(async error => {
                                    console.error("Failed to change variable %s: %o", variable, error);
                                    editingFinished(false);
                                });

                            /* State has changed, enforce a rerender */
                            cacheEntry.updateListener.forEach(callback => callback(false));
                        } else {
                            editingFinished(true);
                            return;
                        }
                    }

                    if(localValue.status !== "set" || !_.isEqual(newValue, localValue.value)) {
                        setLocalValue({
                            status: "set",
                            value: newValue
                        });
                    }
                }
            };
        }
    }

    useReadOnly<T extends keyof Variables>(
        variable: T,
        customData?: any,
        defaultValue?: never
    ) : UiReadOnlyVariableStatus<Variables, T>;

    useReadOnly<T extends keyof Variables>(
        variable: T,
        customData: any | undefined,
        defaultValue: Variables[T]
    ) : Variables[T];

    useReadOnly(variable, customData?, defaultValue?) {
        const cacheEntry = this.getOrCreateVariable(variable as string, customData);
        const [, setRemoteVersion ] = useState(0);

        useEffect(() => {
            /* Initial rendered */
            let listener;
            cacheEntry.updateListener.push(listener = () => {
                /* We can't just increment the old one by one since this update listener may fires twice before rendering */
                setRemoteVersion(++staticRevisionId);
            });

            return () => {
                cacheEntry.updateListener.remove(listener);
                this.derefVariable(cacheEntry);
            };
        }, []);

        if(arguments.length >= 3) {
            return cacheEntry.status === "loaded" ? cacheEntry.currentValue : defaultValue;
        } else {
            return {
                status: cacheEntry.status,
                value: cacheEntry.currentValue
            };
        }
    }

    protected notifyRemoteVariable(variable: string, customData: any | undefined, value: any) {
        let cacheEntry = this.variableCache[variable]?.find(variable => _.isEqual(variable.customData, customData));
        if(!cacheEntry) {
            return;
        }

        cacheEntry.status = "loaded";
        cacheEntry.currentValue = value;
        cacheEntry.updateListener.forEach(callback => callback(true));
    }

    protected abstract doRequestVariable(variable: string, customData: any | undefined);
    protected abstract doEditVariable(variable: string, customData: any | undefined, value: any) : Promise<void> | void;
}
