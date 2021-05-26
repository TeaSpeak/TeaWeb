export interface AddressTarget {
    target_ip: string;
    target_port?: number;
}

export interface ResolveOptions {
    timeout?: number;
    allowCache?: boolean;
    maxDepth?: number;

    allowSrv?: boolean;
    allowCName?: boolean;
    allowAny?: boolean;
    allowA?: boolean;
    allowAAAA?: boolean;
}

export const default_options: ResolveOptions = {
    timeout: 5000,
    allowCache: true,
    maxDepth: 5
};

export interface DNSResolveOptions {
    timeout?: number;
    allowCache?: boolean;
    maxDepth?: number;

    allowSrv?: boolean;
    allowCName?: boolean;
    allowAny?: boolean;
    allowA?: boolean;
    allowAAAA?: boolean;
}

export interface DNSAddress {
    hostname: string,
    port: number
}

export type DNSResolveResult = {
    status: "success",
    originalAddress: DNSAddress,
    resolvedAddress: DNSAddress
} | {
    status: "error",
    message: string
} | {
    status: "empty-result"
};

export interface DNSProvider {
    resolveAddress(address: DNSAddress, options: DNSResolveOptions) : Promise<DNSResolveResult>;
    resolveAddressIPv4(address: DNSAddress, options: DNSResolveOptions) : Promise<DNSResolveResult>;
}

let provider: DNSProvider;
export function getDNSProvider() : DNSProvider {
    return provider;
}

export function setDNSProvider(newProvider: DNSProvider) {
    provider = newProvider;
}