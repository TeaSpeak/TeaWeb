import {Dispatch, SetStateAction, useEffect, useMemo, useState} from "react";

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