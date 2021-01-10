import {AddressTarget, ResolveOptions} from "tc-shared/dns";
import {ServerAddress} from "tc-shared/tree/Server";
import {resolveAddressIpv4, resolveTeaSpeakServerAddress} from "tc-backend/web/dns/resolver";

export function supported() { return true; }

export async function resolve_address(address: ServerAddress, options?: ResolveOptions) : Promise<AddressTarget> {
    return await resolveTeaSpeakServerAddress(address, options);
}

export async function resolve_address_ipv4(address: string) : Promise<string> {
    return await resolveAddressIpv4(address);
}