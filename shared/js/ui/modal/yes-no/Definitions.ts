export interface ModalYesNoVariables {
    readonly title: string,
    readonly question: string,

    readonly textYes: string | undefined,
    readonly textNo: string | undefined,
}

export interface ModalYesNoEvents {
    action_submit: { status: boolean }
}