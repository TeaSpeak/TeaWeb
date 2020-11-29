import {AddressTarget, default_options, ResolveOptions} from "tc-shared/dns";
import {LogCategory} from "tc-shared/log";
import * as log from "tc-shared/log";
import {ServerAddress} from "tc-shared/tree/Server";
import { tr } from "tc-shared/i18n/localize";

export enum RRType {
    A = 1, // a host address,[RFC1035],
    NS = 2, // an authoritative name server,[RFC1035],
    MD = 3, // a mail destination (OBSOLETE - use MX),[RFC1035],
    MF = 4, // a mail forwarder (OBSOLETE - use MX),[RFC1035],
    CNAME = 5, // the canonical name for an alias,[RFC1035],
    SOA = 6, // marks the start of a zone of authority,[RFC1035],
    MB = 7, // a mailbox domain name (EXPERIMENTAL),[RFC1035],
    MG = 8, // a mail group member (EXPERIMENTAL),[RFC1035],
    MR = 9, // a mail rename domain name (EXPERIMENTAL),[RFC1035],
    NULL_ = 10, // a null RR (EXPERIMENTAL),[RFC1035],
    WKS = 11, // a well known service description,[RFC1035],
    PTR = 12, // a domain name pointer,[RFC1035],
    HINFO = 13, // host information,[RFC1035],
    MINFO = 14, // mailbox or mail list information,[RFC1035],
    MX = 15, // mail exchange,[RFC1035],
    TXT = 16, // text strings,[RFC1035],
    RP = 17, // for Responsible Person,[RFC1183],
    AFSDB = 18, // for AFS Data Base location,[RFC1183][RFC5864],
    X25 = 19, // for X.25 PSDN address,[RFC1183],
    ISDN = 20, // for ISDN address,[RFC1183],
    RT = 21, // for Route Through,[RFC1183],
    NSAP = 22, // "for NSAP address, NSAP style A record",[RFC1706],
    NSAP_PTR = 23, // "for domain name pointer, NSAP style",[RFC1348][RFC1637][RFC1706],
    SIG = 24, // for security signature,[RFC4034][RFC3755][RFC2535][RFC2536][RFC2537][RFC2931][RFC3110][RFC3008],
    KEY = 25, // for security key,[RFC4034][RFC3755][RFC2535][RFC2536][RFC2537][RFC2539][RFC3008][RFC3110],
    PX = 26, // X.400 mail mapping information,[RFC2163],
    GPOS = 27, // Geographical Position,[RFC1712],
    AAAA = 28, // IP6 Address,[RFC3596],
    LOC = 29, // Location Information,[RFC1876],
    NXT = 30, // Next Domain (OBSOLETE),[RFC3755][RFC2535],
    EID = 31, // Endpoint Identifier,[Michael_Patton][http://ana-3.lcs.mit.edu/~jnc/nimrod/dns.txt],
    NIMLOC = 32, // Nimrod Locator,[1][Michael_Patton][http://ana-3.lcs.mit.edu/~jnc/nimrod/dns.txt],
    SRV = 33, // Server Selection,[1][RFC2782],
    ATMA = 34, // ATM Address,"[ ATM Forum Technical Committee, ""ATM Name System, V2.0"", Doc ID: AF-DANS-0152.000, July 2000. Available from and held in escrow by IANA.]",
    NAPTR = 35, // Naming Authority Pointer,[RFC2915][RFC2168][RFC3403],
    KX = 36, // Key Exchanger,[RFC2230],
    CERT = 37, //CERT, // [RFC4398],
    A6 = 38, // A6 (OBSOLETE - use AAAA),[RFC3226][RFC2874][RFC6563],
    DNAME = 39, //DNAME, // [RFC6672],
    SINK = 40, //SINK, // [Donald_E_Eastlake][http://tools.ietf.org/html/draft-eastlake-kitchen-sink],
    OPT = 41, //OPT, // [RFC6891][RFC3225],
    APL = 42, //APL, // [RFC3123],
    DS = 43, // Delegation Signer,[RFC4034][RFC3658],
    SSHFP = 44, // SSH Key Fingerprint,[RFC4255],
    IPSECKEY = 45, //IPSECKEY, // [RFC4025],
    RRSIG = 46, //RRSIG, // [RFC4034][RFC3755],
    NSEC = 47, //NSEC, // [RFC4034][RFC3755],
    DNSKEY = 48, //DNSKEY, // [RFC4034][RFC3755],
    DHCID = 49, //DHCID, // [RFC4701],
    NSEC3 = 50, //NSEC3, // [RFC5155],
    NSEC3PARAM = 51, //NSEC3PARAM, // [RFC5155],
    TLSA = 52, //TLSA, // [RFC6698],
    SMIMEA = 53, // S/MIME cert association,[RFC8162],SMIMEA/smimea-completed-template
    Unassigned = 54, // ,
    HIP = 55, // Host Identity Protocol,[RFC8005],
    NINFO = 56, //NINFO [Jim_Reid], // NINFO/ninfo-completed-template
    RKEY = 57, //RKEY [Jim_Reid], // RKEY/rkey-completed-template
    TALINK = 58, // Trust Anchor LINK,[Wouter_Wijngaards],TALINK/talink-completed-template
    CDS = 59, // Child DS,[RFC7344],CDS/cds-completed-template
    CDNSKEY = 60, // DNSKEY(s) the Child wants reflected in DS,[RFC7344],
    OPENPGPKEY = 61, // OpenPGP Key,[RFC7929],OPENPGPKEY/openpgpkey-completed-template
    CSYNC = 62, // Child-To-Parent Synchronization,[RFC7477],
    ZONEMD = 63, // message digest for DNS zone,[draft-wessels-dns-zone-digest],ZONEMD/zonemd-completed-template
    //Unassigned = 64-98,
    SPF = 99, // [RFC7208],
    UINFO = 100, // [IANA-Reserved],
    UID = 101, // [IANA-Reserved],
    GID = 102, // [IANA-Reserved],
    UNSPEC = 103, // [IANA-Reserved],
    NID = 104, //[RFC6742], // ILNP/nid-completed-template
    L32 = 105, //[RFC6742], // ILNP/l32-completed-template
    L64 = 106, //[RFC6742], // ILNP/l64-completed-template
    LP = 107, //[RFC6742], // ILNP/lp-completed-template
    EUI48 = 108, // an EUI-48 address,[RFC7043],EUI48/eui48-completed-template
    EUI64 = 109, // an EUI-64 address,[RFC7043],EUI64/eui64-completed-template
    //Unassigned = 110-248, // ,
    TKEY = 249, // Transaction Key,[RFC2930],
    TSIG = 250, // Transaction Signature,[RFC2845],
    IXFR = 251, // incremental transfer,[RFC1995],
    AXFR = 252, // transfer of an entire zone,[RFC1035][RFC5936],
    MAILB = 253, // "mailbox-related RRs (MB, MG or MR)",[RFC1035],
    MAILA = 254, // mail agent RRs (OBSOLETE - see MX),[RFC1035],
    ANY = 255, // A request for some or all records the server has available,[RFC1035][RFC6895][RFC8482],
    URI = 256, //URI [RFC7553], // URI/uri-completed-template
    CAA = 257, // Certification Authority Restriction,[RFC-ietf-lamps-rfc6844bis-07],CAA/caa-completed-template
    AVC = 258, // Application Visibility and Control,[Wolfgang_Riedel],AVC/avc-completed-template
    DOA = 259, // Digital Object Architecture,[draft-durand-doa-over-dns],DOA/doa-completed-template
    AMTRELAY = 260, // Automatic Multicast Tunneling Relay,[draft-ietf-mboned-driad-amt-discovery],AMTRELAY/amtrelay-completed-template
    //Unassigned = 261-32767,
    TA = 32768, // DNSSEC Trust Authorities,"[Sam_Weiler][http://cameo.library.cmu.edu/][ Deploying DNSSEC Without a Signed Root. Technical Report 1999-19,
    // Information Networking Institute, Carnegie Mellon University, April 2004.]",
    DLV = 32769, // DNSSEC Lookaside Validation,[RFC4431],
    //Unassigned = 32770-65279,, // ,
    //Private use,65280-65534,,,,
    Reserved = 65535,
}
export enum ErrorCode {
    NOERROR = 0,
    FORMERR = 1,
    SERVFAIL = 2,
    NXDOMAIN = 3,
    NOTIMP = 4,
    REFUSED = 5,
    YXDOMAIN = 6,
    XRRSET = 7,
    NOTAUTH = 8,
    NOTZONE = 9
}

interface DNSAnswer {
    name: string;
    type: RRType;
    TTL: null;
    data: string;
}

interface DNSQuery {
    name: string;
    type: RRType;
}

interface DNSResponse {
    Status: ErrorCode;
    Comment: string;

    TC: boolean; /* truncated */
    RD: true;
    RA: true;
    AD: boolean; /* DNSSEC valid */
    CD: boolean; /* client DNSSEC disabled */

    Question: DNSQuery[];
    Answer?: DNSAnswer[];
    Authority?: DNSAnswer[];
    Additional: any[];
}

export async function resolve(address: string, type: RRType) : Promise<DNSAnswer[]> {
    const parameters = {};
    parameters["name"] = address;
    parameters["type"] = type;
    parameters["cd"] = false; /* check disabled */
    parameters["do"] = true; /* DNSSEC info */

    const parameter_string = Object.keys(parameters).reduceRight((a, b) => a + "&" + b + "=" + encodeURIComponent(parameters[b]));
    const response = await fetch("https://dns.google/resolve?" + parameter_string, {
        method: "GET"
    });
    if(response.status !== 200)
        throw response.statusText || tr("server returned ") + response.status;

    let response_string = "unknown";
    let response_data: DNSResponse;
    try {
        response_string = await response.text();
        response_data = JSON.parse(response_string);
    } catch(ex) {
        log.error(LogCategory.DNS, tr("Failed to parse response data: %o. Data: %s"), ex, response_string);
        throw "failed to parse response";
    }

    if(response_data.TC)
        throw "truncated response";

    if(response_data.Status !== ErrorCode.NOERROR) {
        if(response_data.Status === ErrorCode.NXDOMAIN)
            return [];
        throw "dns error code " + response_data.Status;
    }

    log.trace(LogCategory.DNS, tr("Result for query %s (%s): %o"), address, RRType[type], response_data);

    if(!response_data.Answer) return [];
    return response_data.Answer.filter(e => (e.name === address || e.name === address + ".") && e.type === type);
}

type Address = { host: string, port: number };

interface DNSResolveMethod {
    name() : string;
    resolve(address: Address) : Promise<Address | undefined>;
}

class IPResolveMethod implements DNSResolveMethod {
    readonly v6: boolean;

    constructor(v6: boolean) {
        this.v6 = v6;
    }


    name(): string {
        return "ip v" + (this.v6 ? "6" : "4") + " resolver";
    }

    resolve(address: Address): Promise<Address | undefined> {
        return resolve(address.host, this.v6 ? RRType.AAAA : RRType.A).then(e => {
            if(!e.length) return undefined;

            return {
                host: e[0].data,
                port: address.port
            }
        });
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

    resolve(address: Address): Promise<Address | undefined> {
        return resolve((this.application ? this.application + "." : "") + address.host, RRType.SRV).then(e => {
            if(!e) return undefined;

            const records: {[key: number]:ParsedSVRRecord[]} = {};
            for(const record of e) {
                const parts = record.data.split(" ");
                if(parts.length !== 4) {
                    log.warn(LogCategory.DNS, tr("Failed to parse SRV record %s. Invalid split length."), record);
                    continue;
                }

                const priority = parseInt(parts[0]);
                const weight = parseInt(parts[1]);
                const port = parseInt(parts[2]);

                if((priority < 0 || priority > 65535) || (weight < 0 || weight > 65535) || (port < 0 || port > 65535)) {
                    log.warn(LogCategory.DNS, tr("Failed to parse SRV record %s. Malformed data."), record);
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
            if(!priority_strings.length) return undefined;

            let highest_priority: ParsedSVRRecord[];
            for(const priority_str of priority_strings) {
                if(!highest_priority || !highest_priority.length)
                    highest_priority = records[priority_str];

                if(highest_priority[0].priority < parseInt(priority_str))
                    highest_priority = records[priority_str];
            }

            if(!highest_priority.length) return undefined;

            /* select randomly one record */
            let record: ParsedSVRRecord;
            const max_weight = highest_priority.map(e => e.weight).reduce((a, b) => a + b, 0);
            if(max_weight == 0) record = highest_priority[Math.floor(Math.random() * highest_priority.length)];
            else {
                let rnd = Math.random() * max_weight;
                for(let i = 0; i < highest_priority.length; i++) {
                    rnd -= highest_priority[i].weight;
                    if(rnd > 0) continue;

                    record = highest_priority[i];
                    break;
                }
            }
            if(!record) /* shall never happen */
                record = highest_priority[0];
            return {
                host: record.target,
                port: record.port == 0 ? address.port : record.port
            };
        });
    }
}

class SRV_IPResolveMethod implements DNSResolveMethod {
    readonly srv_resolver: DNSResolveMethod;
    readonly ipv4_resolver: IPResolveMethod;
    readonly ipv6_resolver: IPResolveMethod;

    constructor(srv_resolver: DNSResolveMethod, ipv4_resolver: IPResolveMethod, ipv6_resolver: IPResolveMethod) {
        this.srv_resolver = srv_resolver;
        this.ipv4_resolver = ipv4_resolver;
        this.ipv6_resolver = ipv6_resolver;
    }

    name(): string {
        return "srv ip resolver [" + this.srv_resolver.name() + "; " + this.ipv4_resolver.name() + "; " + this.ipv6_resolver.name() + "]";
    }

    resolve(address: Address): Promise<Address | undefined> {
        return this.srv_resolver.resolve(address).then(e => {
            if(!e) return undefined;

            return this.ipv4_resolver.resolve(e).catch(() => this.ipv6_resolver.resolve(e));
        });
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

    resolve(address: Address): Promise<Address | undefined> {
        const parts = address.host.split(".");
        if(parts.length < 3) return undefined;

        return this.resolver.resolve({
            host: parts.slice(-2).join("."),
            port: address.port
        });
    }
}

class TeaSpeakDNSResolve {
    readonly address: Address;
    private resolvers: {[key: string]:{resolver: DNSResolveMethod, after: string[]}} = {};
    private resolving = false;
    private timeout;

    private callback_success;
    private callback_fail;

    private finished_resolvers: string[];
    private resolving_resolvers: string[];

    constructor(addr: Address) {
        this.address = addr;
    }

    register_resolver(resolver: DNSResolveMethod, ...after: (string | DNSResolveMethod)[]) {
        if(this.resolving) throw tr("resolver is already resolving");

        this.resolvers[resolver.name()] = { resolver: resolver, after: after.map(e => typeof e === "string" ? e : e.name()) };
    }

    resolve(timeout: number) : Promise<Address> {
        if(this.resolving) throw tr("already resolving");
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
        log.trace(LogCategory.DNS, tr("Start resolving %s:%d"), this.address.host, this.address.port);

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
            log.trace(LogCategory.DNS, tr(" Executing resolver %s"), resolver_name);

            this.resolving_resolvers.push(resolver_name);
            resolver.resolver.resolve(this.address).then(result => {
                if(!this.resolving || !this.callback_success) return; /* resolve has been finished already */
                this.finished_resolvers.push(resolver_name);

                if(!result) {
                    log.trace(LogCategory.DNS, tr(" Resolver %s returned an empty response."), resolver_name);
                    this.invoke_resolvers();
                    return;
                }

                log.trace(LogCategory.DNS, tr(" Successfully resolved address %s:%d to %s:%d via resolver %s"),
                    this.address.host, this.address.port,
                    result.host, result.port,
                    resolver_name);
                this.callback_success(result);
            }).catch(error => {
                if(!this.resolving || !this.callback_success) return; /* resolve has been finished already */
                this.finished_resolvers.push(resolver_name);

                log.trace(LogCategory.DNS, tr(" Resolver %s ran into an error: %o"), resolver_name, error);
                this.invoke_resolvers();
            }).then(() => {
                this.resolving_resolvers.remove(resolver_name);
                if(!this.resolving_resolvers.length && this.resolving)
                    this.invoke_resolvers();
            });
        }

        if(invoke_count === 0 && !this.resolving_resolvers.length && this.resolving)
            this.callback_fail("no response");
    }
}

const resolver_ip_v4 = new IPResolveMethod(false);
const resolver_ip_v6 = new IPResolveMethod(true);

const resolver_srv_ts = new SRV_IPResolveMethod(new SRVResolveMethod("_ts._udp"), resolver_ip_v4, resolver_ip_v6);
const resolver_srv_ts3 = new SRV_IPResolveMethod(new SRVResolveMethod("_ts3._udp"), resolver_ip_v4, resolver_ip_v6);

const resolver_dr_srv_ts = new DomainRootResolveMethod(resolver_srv_ts);
const resolver_dr_srv_ts3 = new DomainRootResolveMethod(resolver_srv_ts3);

export function supported() { return true; }

export async function resolve_address(address: ServerAddress, _options?: ResolveOptions) : Promise<AddressTarget> {
    const options = Object.assign({}, default_options);
    Object.assign(options, _options);

    const resolver = new TeaSpeakDNSResolve(address);

    resolver.register_resolver(resolver_srv_ts);
    resolver.register_resolver(resolver_srv_ts3);
    //TODO: TSDNS somehow?

    resolver.register_resolver(resolver_dr_srv_ts, resolver_srv_ts);
    resolver.register_resolver(resolver_dr_srv_ts3, resolver_srv_ts3);

    resolver.register_resolver(resolver_ip_v4, resolver_srv_ts, resolver_srv_ts3);
    resolver.register_resolver(resolver_ip_v6, resolver_ip_v4);

    const response = await resolver.resolve(options.timeout || 5000);
    return {
        target_ip: response.host,
        target_port: response.port
    };
}

export async function resolve_address_ipv4(address: string) : Promise<string> {
    const result = await resolve(address, RRType.A);
    if(!result.length) return undefined;

    return result[0].data;
}