import {AddressTarget, ResolveOptions} from "tc-shared/dns";
import {ServerAddress} from "tc-shared/tree/Server";
import {resolveAddressIpV4, resolveTeaSpeakServerAddress} from "./dns/resolver";

export function supported() { return true; }

export async function resolve_address(address: ServerAddress, options?: ResolveOptions) : Promise<AddressTarget> {
    return await resolveTeaSpeakServerAddress(address, options);
}

export async function resolve_address_ipv4(address: string) : Promise<string> {
    return await resolveAddressIpV4(address);
}