export enum FilterType {
    THRESHOLD,
    VOICE_LEVEL,
    STATE
}

export interface FilterBase {
    readonly priority: number;

    setEnabled(flag: boolean) : void;
    isEnabled() : boolean;
}

export interface MarginedFilter {
    getMarginFrames() : number;
    setMarginFrames(value: number);
}

export interface ThresholdFilter extends FilterBase, MarginedFilter {
    readonly type: FilterType.THRESHOLD;

    getThreshold() : number;
    setThreshold(value: number);

    getAttackSmooth() : number;
    getReleaseSmooth() : number;

    setAttackSmooth(value: number);
    setReleaseSmooth(value: number);

    registerLevelCallback(callback: (value: number) => void);
    removeLevelCallback(callback: (value: number) => void);
}

export interface VoiceLevelFilter extends FilterBase, MarginedFilter {
    type: FilterType.VOICE_LEVEL;

    getLevel() : number;
}

export interface StateFilter extends FilterBase {
    type: FilterType.STATE;

    setState(state: boolean);
    isActive() : boolean; /* if true the the filter allows data to pass */
}

export type FilterTypeClass<T extends FilterType> =
    T extends FilterType.STATE ? StateFilter :
    T extends FilterType.VOICE_LEVEL ? VoiceLevelFilter :
    T extends FilterType.THRESHOLD ? ThresholdFilter :
        never;

export type Filter = ThresholdFilter | VoiceLevelFilter | StateFilter;