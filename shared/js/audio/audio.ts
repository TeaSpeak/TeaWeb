namespace audio {
    export namespace player {
        export interface Device {
            device_id: string;

            driver: string;
            name: string;
        }
    }
}