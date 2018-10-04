declare class StaticSettings {
    static instance : StaticSettings;

    static?<T>(key: string, _default?: T) : T;
    deleteStatic(key: string);
}

declare type BodyCreator = (() => JQuery | JQuery[] | string) | string | JQuery | JQuery[];
declare class ModalProperties {
    header: BodyCreator;
    body: BodyCreator;
    footer: BodyCreator;

    closeListener: (() => void) | (() => void)[];

    registerCloseListener(listener: () => void): this;

    width: number | string;
    hight: number | string;

    closeable: boolean;

    triggerClose();
}

declare function createErrorModal(header: BodyCreator, message: BodyCreator, props: ModalProperties | any);
declare function displayCriticalError(message: string);

declare interface Window {
    $: JQuery;
    displayCriticalError: typeof displayCriticalError;
}