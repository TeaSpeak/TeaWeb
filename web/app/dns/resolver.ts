import * as log from "tc-shared/log";
import {LogCategory, logTrace, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {ServerAddress} from "tc-shared/tree/Server";
import {AddressTarget, default_options, ResolveOptions} from "tc-shared/dns";
import {executeDnsRequest, RRType} from "tc-backend/web/dns/api";

type Address = { host: string, port: number };

interface DNSResolveMethod {
    name() : string;
    resolve(address: Address) : Promise<Address | undefined>;
}

class LocalhostResolver implements DNSResolveMethod {
    name(): string {
        return "localhost";
    }

    async resolve(address: Address): Promise<Address | undefined> {
        if(address.host === "localhost") {
            return {
                host: "127.0.0.1",
                port: address.port
            }
        }

        return undefined;
    }

}

class IPResolveMethod implements DNSResolveMethod {
    readonly v6: boolean;

    constructor(v6: boolean) {
        this.v6 = v6;
    }


    name(): string {
        return "ip v" + (this.v6 ? "6" : "4") + " resolver";
    }

    async resolve(address: Address): Promise<Address | undefined> {
        const answer = await executeDnsRequest(address.host, this.v6 ? RRType.AAAA : RRType.A);
        if(!answer.length) {
            return undefined;
        }

        return {
            host: answer[0].data,
            port: address.port
        }
    }
}

type ParsedSVRRecord = {
    target: string;
    port: number;

    priority: number;
    weight: number;
}
class SRVResolveMethod implements DNSResolveMethod {
    readonly application: string;

    constructor(app: string) {
        this.application = app;
    }

    name(): string {
        return "srv resolve [" + this.application + "]";
    }

    async resolve(address: Address): Promise<Address | undefined> {
        const answer = await executeDnsRequest((this.application ? this.application + "." : "") + address.host, RRType.SRV);

        const records: {[key: number]: ParsedSVRRecord[]} = {};
        for(const record of answer) {
            const parts = record.data.split(" ");
            if(parts.length !== 4) {
                logWarn(LogCategory.DNS, tr("Failed to parse SRV record %s. Invalid split length."), record);
                continue;
            }

            const priority = parseInt(parts[0]);
            const weight = parseInt(parts[1]);
            const port = parseInt(parts[2]);

            if((priority < 0 || priority > 65535) || (weight < 0 || weight > 65535) || (port < 0 || port > 65535)) {
                logWarn(LogCategory.DNS, tr("Failed to parse SRV record %s. Malformed data."), record);
                continue;
            }

            (records[priority] || (records[priority] = [])).push({
                priority: priority,
                weight: weight,
                port: port,
                target: parts[3]
            });
        }

        /* get the record with the highest priority */
        const priority_strings = Object.keys(records);
        if(!priority_strings.length) {
            return undefined;
        }

        let highestPriority: ParsedSVRRecord[];
        for(const priority_str of priority_strings) {
            if(!highestPriority || !highestPriority.length) {
                highestPriority = records[priority_str];
            }

            if(highestPriority[0].priority < parseInt(priority_str)) {
                highestPriority = records[priority_str];
            }
        }

        if(!highestPriority.length) {
            return undefined;
        }

        /* select randomly one record */
        let record: ParsedSVRRecord;
        const max_weight = highestPriority.map(e => e.weight).reduce((a, b) => a + b, 0);
        if(max_weight == 0) {
            record = highestPriority[Math.floor(Math.random() * highestPriority.length)];
        } else {
            let rnd = Math.random() * max_weight;
            for(let i = 0; i < highestPriority.length; i++) {
                rnd -= highestPriority[i].weight;
                if(rnd > 0) {
                    continue;
                }

                record = highestPriority[i];
                break;
            }
        }

        if(!record) {
            /* shall never happen */
            record = highestPriority[0];
        }

        return {
            host: record.target,
            port: record.port == 0 ? address.port : record.port
        };
    }
}

class SRV_IPResolveMethod implements DNSResolveMethod {
    readonly srvResolver: DNSResolveMethod;
    readonly ipv4Resolver: IPResolveMethod;
    readonly ipv6Resolver: IPResolveMethod;

    constructor(srv_resolver: DNSResolveMethod, ipv4Resolver: IPResolveMethod, ipv6Resolver: IPResolveMethod) {
        this.srvResolver = srv_resolver;
        this.ipv4Resolver = ipv4Resolver;
        this.ipv6Resolver = ipv6Resolver;
    }

    name(): string {
        return "srv ip resolver [" + this.srvResolver.name() + "; " + this.ipv4Resolver.name() + "; " + this.ipv6Resolver.name() + "]";
    }

    async resolve(address: Address): Promise<Address | undefined> {
        const srvAddress = await this.srvResolver.resolve(address);
        if(!srvAddress) {
            return undefined;
        }

        try {
            return await this.ipv4Resolver.resolve(srvAddress);
        } catch (_error) {
            return await this.ipv6Resolver.resolve(srvAddress);
        }
    }
}

class DomainRootResolveMethod implements DNSResolveMethod {
    readonly resolver: DNSResolveMethod;

    constructor(resolver: DNSResolveMethod) {
        this.resolver = resolver;
    }

    name(): string {
        return "domain-root [" + this.resolver.name() + "]";
    }

    async resolve(address: Address): Promise<Address | undefined> {
        const parts = address.host.split(".");
        if(parts.length < 3) {
            return undefined;
        }

        return await this.resolver.resolve({
            host: parts.slice(-2).join("."),
            port: address.port
        });
    }
}

class TeaSpeakDNSResolve {
    readonly address: Address;
    private resolvers: {[key: string]:{ resolver: DNSResolveMethod, after: string[] }} = {};
    private resolving = false;
    private timeout;

    private callback_success;
    private callback_fail;

    private finished_resolvers: string[];
    private resolving_resolvers: string[];

    constructor(addr: Address) {
        this.address = addr;
    }

    registerResolver(resolver: DNSResolveMethod, ...after: (string | DNSResolveMethod)[]) {
        if(this.resolving) {
            throw tr("resolver is already resolving");
        }

        this.resolvers[resolver.name()] = { resolver: resolver, after: after.map(e => typeof e === "string" ? e : e.name()) };
    }

    resolve(timeout: number) : Promise<Address> {
        if(this.resolving) {
            throw tr("already resolving");
        }
        this.resolving = true;

        this.finished_resolvers = [];
        this.resolving_resolvers = [];

        const cleanup = () => {
            clearTimeout(this.timeout);
            this.resolving = false;
        };

        this.timeout = setTimeout(() => {
            this.callback_fail(tr("timeout"));
        }, timeout);
        logTrace(LogCategory.DNS, tr("Start resolving %s:%d"), this.address.host, this.address.port);

        return new Promise<Address>((resolve, reject) => {
            this.callback_success = data => {
                cleanup();
                resolve(data);
            };

            this.callback_fail = error => {
                cleanup();
                reject(error);
            };

            this.invoke_resolvers();
        });
    }

    private invoke_resolvers() {
        let invoke_count = 0;

        _main_loop:
            for(const resolver_name of Object.keys(this.resolvers)) {
                if(this.resolving_resolvers.findIndex(e => e === resolver_name) !== -1) continue;
                if(this.finished_resolvers.findIndex(e => e === resolver_name) !== -1) continue;

                const resolver = this.resolvers[resolver_name];
                for(const after of resolver.after)
                    if(this.finished_resolvers.findIndex(e => e === after) === -1) continue _main_loop;

                invoke_count++;
                logTrace(LogCategory.DNS, tr(" Executing resolver %s"), resolver_name);

                this.resolving_resolvers.push(resolver_name);
                resolver.resolver.resolve(this.address).then(result => {
                    if(!this.resolving || !this.callback_success) return; /* resolve has been finished already */
                    this.finished_resolvers.push(resolver_name);

                    if(!result) {
                        logTrace(LogCategory.DNS, tr(" Resolver %s returned an empty response."), resolver_name);
                        this.invoke_resolvers();
                        return;
                    }

                    logTrace(LogCategory.DNS, tr(" Successfully resolved address %s:%d to %s:%d via resolver %s"),
                        this.address.host, this.address.port,
                        result.host, result.port,
                        resolver_name);
                    this.callback_success(result);
                }).catch(error => {
                    if(!this.resolving || !this.callback_success) return; /* resolve has been finished already */
                    this.finished_resolvers.push(resolver_name);

                    logTrace(LogCategory.DNS, tr(" Resolver %s ran into an error: %o"), resolver_name, error);
                    this.invoke_resolvers();
                }).then(() => {
                    this.resolving_resolvers.remove(resolver_name);
                    if(!this.resolving_resolvers.length && this.resolving)
                        this.invoke_resolvers();
                });
            }

        if(invoke_count === 0 && !this.resolving_resolvers.length && this.resolving) {
            this.callback_fail("no response");
        }
    }
}

const kResolverLocalhost = new LocalhostResolver();

const kResolverIpV4 = new IPResolveMethod(false);
const kResolverIpV6 = new IPResolveMethod(true);

const resolverSrvTS = new SRV_IPResolveMethod(new SRVResolveMethod("_ts._udp"), kResolverIpV4, kResolverIpV6);
const resolverSrvTS3 = new SRV_IPResolveMethod(new SRVResolveMethod("_ts3._udp"), kResolverIpV4, kResolverIpV6);

const resolverDrSrvTS = new DomainRootResolveMethod(resolverSrvTS);
const resolverDrSrvTS3 = new DomainRootResolveMethod(resolverSrvTS3);

export async function resolveTeaSpeakServerAddress(address: ServerAddress, _options?: ResolveOptions) : Promise<AddressTarget> {
    const options = Object.assign({}, default_options);
    Object.assign(options, _options);

    const resolver = new TeaSpeakDNSResolve(address);

    resolver.registerResolver(kResolverLocalhost);

    resolver.registerResolver(resolverSrvTS, kResolverLocalhost);
    resolver.registerResolver(resolverSrvTS3, kResolverLocalhost);
    //TODO: TSDNS somehow?

    resolver.registerResolver(resolverDrSrvTS, resolverSrvTS);
    resolver.registerResolver(resolverDrSrvTS3, resolverSrvTS3);

    resolver.registerResolver(kResolverIpV4, resolverSrvTS, resolverSrvTS3);
    resolver.registerResolver(kResolverIpV6, kResolverIpV4);

    const response = await resolver.resolve(options.timeout || 5000);
    return {
        target_ip: response.host,
        target_port: response.port
    };
}

export async function resolveAddressIpV4(address: string) : Promise<string> {
    const result = await executeDnsRequest(address, RRType.A);
    if(!result.length) return undefined;

    return result[0].data;
}