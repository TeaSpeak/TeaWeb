namespace dns {
    export interface AddressTarget {
        target_ip: string;
        target_port?: number;
    }
    export interface ResolveOptions {
        timeout?: number;
        allow_cache?: boolean;
        max_depth?: number;

        allow_srv?: boolean;
        allow_cname?: boolean;
        allow_any?: boolean;
        allow_a?: boolean;
        allow_aaaa?: boolean;
    }
    export const default_options: ResolveOptions = {
        timeout: 5000,
        allow_cache: true,
        max_depth: 5,

        allow_a: true,
        allow_aaaa: true,
        allow_any: true,
        allow_cname: true,
        allow_srv: true
    };

    export function supported() { return false; }
    export function resolve_address(address: string, options?: ResolveOptions) : Promise<AddressTarget> {
        return Promise.reject("not supported");
    }

    //TODO: Implement a remote server DNS request API
}