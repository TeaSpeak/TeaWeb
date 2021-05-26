export interface ModalAboutVariables {
    readonly uiVersion: string,
    readonly uiVersionTimestamp: number,
    readonly nativeVersion: string,

    eggShown: boolean
}

export interface ModalAboutEvents {
    action_update_high_score: { score: number },
    query_high_score: {},
    notify_high_score: { score: number },
}