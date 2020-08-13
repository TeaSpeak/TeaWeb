export enum FilterType {
    THRESHOLD,
    VOICE_LEVEL,
    STATE
}

export interface FilterBase {
    readonly priority: number;

    set_enabled(flag: boolean) : void;
    is_enabled() : boolean;
}

export interface MarginedFilter {
    get_margin_frames() : number;
    set_margin_frames(value: number);
}

export interface ThresholdFilter extends FilterBase, MarginedFilter {
    readonly type: FilterType.THRESHOLD;

    get_threshold() : number;
    set_threshold(value: number) : Promise<void>;

    get_attack_smooth() : number;
    get_release_smooth() : number;

    set_attack_smooth(value: number);
    set_release_smooth(value: number);

    callback_level?: (value: number) => any;
}

export interface VoiceLevelFilter extends FilterBase, MarginedFilter {
    type: FilterType.VOICE_LEVEL;

    get_level() : number;
}

export interface StateFilter extends FilterBase {
    type: FilterType.STATE;

    set_state(state: boolean) : Promise<void>;
    is_active() : boolean; /* if true the the filter allows data to pass */
}

export type FilterTypeClass<T extends FilterType> =
    T extends FilterType.STATE ? StateFilter :
    T extends FilterType.VOICE_LEVEL ? VoiceLevelFilter :
    T extends FilterType.THRESHOLD ? ThresholdFilter :
        never;

export type Filter = ThresholdFilter | VoiceLevelFilter | StateFilter;