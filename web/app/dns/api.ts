import {tr} from "tc-shared/i18n/localize";
import * as log from "tc-shared/log";
import {LogCategory, logTrace} from "tc-shared/log";

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

export async function executeDnsRequest(address: string, type: RRType) : Promise<DNSAnswer[]> {
    const parameters = {};
    parameters["name"] = address;
    parameters["type"] = type;
    parameters["cd"] = false; /* check disabled */
    parameters["do"] = true; /* DNSSEC info */

    const parameter_string = Object.keys(parameters).reduceRight((a, b) => a + "&" + b + "=" + encodeURIComponent(parameters[b]));
    const response = await fetch("https://dns.google/resolve?" + parameter_string, {
        method: "GET"
    });

    if(response.status !== 200) {
        throw response.statusText || tr("server returned ") + response.status;
    }

    let response_string = "unknown";
    let responseData: DNSResponse;
    try {
        response_string = await response.text();
        responseData = JSON.parse(response_string);
    } catch(ex) {
        log.error(LogCategory.DNS, tr("Failed to parse response data: %o. Data: %s"), ex, response_string);
        throw "failed to parse response";
    }

    if(responseData.TC) {
        throw "truncated response";
    }

    if(responseData.Status !== ErrorCode.NOERROR) {
        if(responseData.Status === ErrorCode.NXDOMAIN) {
            return [];
        }

        throw "dns error code " + responseData.Status;
    }

    logTrace(LogCategory.DNS, tr("Result for query %s (%s): %o"), address, RRType[type], responseData);

    if(!responseData.Answer) {
        return [];
    }

    return responseData.Answer.filter(e => (e.name === address || e.name === address + ".") && e.type === type);
}