import * as a from "./module_a";

export declare class PokeModal {
    //private source_map: a.TestClass[];
    private _awaiters_unique_ids: {
        [unique_id: string]: ((resolved: a.TestClass) => any)[];
    };
}