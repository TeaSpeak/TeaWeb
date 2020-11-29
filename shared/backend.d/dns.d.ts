import {AddressTarget, ResolveOptions} from "tc-shared/dns";
import {ServerAddress} from "tc-shared/tree/Server";

export function supported();
export function resolve_address(address: ServerAddress, options?: ResolveOptions) : Promise<AddressTarget>;
export function resolve_address_ipv4(address: string) : Promise<string>;