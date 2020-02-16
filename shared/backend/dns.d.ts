declare namespace dns {
    export function supported();
    export function resolve_address(address: ServerAddress, options?: ResolveOptions) : Promise<AddressTarget>;
}