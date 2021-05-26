import {DNSAddress, DNSProvider, DNSResolveOptions, DNSResolveResult, setDNSProvider} from "tc-shared/dns";
import {LogCategory, logError} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {resolveAddressIpV4, resolveTeaSpeakServerAddress} from "../dns/resolver";

setDNSProvider(new class implements DNSProvider {
    resolveAddress(address: DNSAddress, options: DNSResolveOptions): Promise<DNSResolveResult> {
        return resolveTeaSpeakServerAddress(address, options);
    }

    async resolveAddressIPv4(address: DNSAddress, options: DNSResolveOptions): Promise<DNSResolveResult> {
        try {
            const result = await resolveAddressIpV4(address.hostname);
            if(!result) {
                return { status: "empty-result" };
            }
            return {
                status: "success",
                originalAddress: address,
                resolvedAddress: {
                    hostname: result,
                    port: address.port
                }
            };
        } catch (error) {
            if(typeof error !== "string") {
                logError(LogCategory.DNS, tr("Failed to resolve %o: %o"), address, error);
                error = tr("lookup the console");
            }

            return {
                status: "error",
                message: error
            };
        }
    }
});