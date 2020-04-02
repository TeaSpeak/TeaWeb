declare global {
    interface BuildDefinitions {
        target: "web" | "client";
        mode: "release" | "debug";

        /* chunk for the loader to load initially */
        entry_chunk_name: string;

        version: string;
        timestamp: number;
    }

    const __build: BuildDefinitions;
}

export {};