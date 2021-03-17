export type PokeRecord = {
    uniqueId: string,
    timestamp: number,

    handlerId: string,

    serverName: string,
    serverUniqueId: string,

    clientId: number,
    clientUniqueId: string,
    clientName: string,

    message: string
}

export interface ModalPokeVariables {
    readonly pokeList: PokeRecord[],
}

export interface ModalPokeEvents {
    action_close: {}
}