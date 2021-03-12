import {Dispatch, SetStateAction, useEffect, useMemo, useState} from "react";
import {RegistryKey, RegistryValueType, settings, ValuedRegistryKey} from "tc-shared/settings";

export function useDependentState<S>(
    factory: (prevState?: S) => S,
    inputs: ReadonlyArray<any>,
): [S, Dispatch<SetStateAction<S>>] {
    let skipCalculation = false;

    let [state, setState] = useState<S>(() => {
        skipCalculation = true;
        return factory(undefined);
    });

    useMemo(() => {
        if(skipCalculation) {
            return;
        }

        const newState = factory(state);
        if (newState !== state) {
            setState(state = newState);
        }
    }, inputs);

    return [state, setState];
}

export function useTr(message: string) : string {
    return /* @tr-ignore */ tr(message);
}

export function joinClassList(...classes: any[]) : string {
    return classes.filter(value => typeof value === "string" && value.length > 0).join(" ");
}

export function useGlobalSetting<V extends RegistryValueType>(key: ValuedRegistryKey<V>, defaultValue?: V) : V;
export function useGlobalSetting<V extends RegistryValueType, DV>(key: RegistryKey<V>, defaultValue: DV) : V | DV;

export function useGlobalSetting(key, defaultValue) {
    const [ value, setValue ] = useState(arguments.length > 1 ? settings.getValue(key, defaultValue) : settings.getValue(key));
    useEffect(() => settings.globalChangeListener(key, value => setValue(value)), []);

    return value;
}