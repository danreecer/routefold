/**
 * URL safety guard (SSRF protection).
 *
 * Routefold fetches URLs that arbitrary users submit. Without this module, that
 * is a server-side request forgery primitive pointed at cloud metadata endpoints
 * and internal services.
 *
 * The guard runs twice per request: once on the submitted URL, and again on
 * every redirect target, because a public hostname can redirect to 127.0.0.1.
 *
 * This module is deliberately dependency-free and side-effect-free so it can be
 * unit-tested exhaustively.
 */

export type UrlRejectionReason =
  | 'invalid-url'
  | 'unsupported-protocol'
  | 'missing-hostname'
  | 'credentials-in-url'
  | 'loopback-address'
  | 'private-address'
  | 'link-local-address'
  | 'unique-local-address'
  | 'reserved-address'
  | 'internal-hostname'
  | 'blocked-port'
  | 'url-too-long';

export type UrlGuardResult =
  | { ok: true; url: URL }
  | { ok: false; reason: UrlRejectionReason; message: string };

const MAX_URL_LENGTH = 2048;

/**
 * Ports outside this set are refused. Nothing legitimate that Routefold needs to
 * read is served anywhere else, and open ports are the point of an SSRF probe.
 */
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

/**
 * Hostnames that must never be resolved, matched case-insensitively against the
 * whole hostname or its final label.
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'nsx',
  'kubernetes',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

/** Internal-only TLDs and suffixes commonly used for private infrastructure. */
const BLOCKED_SUFFIXES = [
  '.local',
  '.localhost',
  '.internal',
  '.intranet',
  '.private',
  '.corp',
  '.home',
  '.lan',
  '.test',
  '.example',
  '.invalid',
  '.svc',
  '.cluster.local',
];

const REASON_MESSAGES: Record<UrlRejectionReason, string> = {
  'invalid-url': 'That is not a valid URL.',
  'unsupported-protocol': 'Only http:// and https:// URLs can be retrieved.',
  'missing-hostname': 'The URL has no hostname.',
  'credentials-in-url': 'URLs containing embedded credentials are not accepted.',
  'loopback-address': 'Loopback addresses cannot be retrieved.',
  'private-address': 'Private network addresses cannot be retrieved.',
  'link-local-address': 'Link-local addresses cannot be retrieved.',
  'unique-local-address': 'Unique local addresses cannot be retrieved.',
  'reserved-address': 'Reserved IP ranges cannot be retrieved.',
  'internal-hostname': 'Internal hostnames cannot be retrieved.',
  'blocked-port': 'That port is not permitted.',
  'url-too-long': 'That URL is too long.',
};

function reject(reason: UrlRejectionReason): UrlGuardResult {
  return { ok: false, reason, message: REASON_MESSAGES[reason] };
}

/** Parses a dotted-quad IPv4 literal. Returns null when it is not one. */
export function parseIpv4(host: string): [number, number, number, number] | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets as [number, number, number, number];
}

/**
 * Classifies an IPv4 literal. Covers every range that must never be reachable:
 * loopback, RFC1918 private, link-local (including 169.254.169.254 — the cloud
 * metadata endpoint), carrier-grade NAT, and all reserved blocks.
 */
export function classifyIpv4(octets: [number, number, number, number]): UrlRejectionReason | null {
  const [a, b] = octets;

  if (a === 127) return 'loopback-address';
  if (a === 0) return 'reserved-address';
  if (a === 10) return 'private-address';
  if (a === 172 && b >= 16 && b <= 31) return 'private-address';
  if (a === 192 && b === 168) return 'private-address';
  if (a === 169 && b === 254) return 'link-local-address';
  if (a === 100 && b >= 64 && b <= 127) return 'private-address'; // CGNAT, RFC 6598
  if (a === 192 && b === 0) return 'reserved-address'; // 192.0.0.0/24 + 192.0.2.0/24
  if (a === 192 && b === 88) return 'reserved-address';
  if (a === 198 && (b === 18 || b === 19)) return 'reserved-address'; // benchmarking
  if (a === 198 && b === 51) return 'reserved-address'; // TEST-NET-2
  if (a === 203 && b === 0) return 'reserved-address'; // TEST-NET-3
  if (a >= 224) return 'reserved-address'; // multicast + reserved + broadcast

  return null;
}

function normaliseIpv6(host: string): string {
  return host.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
}

/** Classifies an IPv6 literal, including IPv4-mapped forms like ::ffff:127.0.0.1. */
export function classifyIpv6(rawHost: string): UrlRejectionReason | null {
  const host = normaliseIpv6(rawHost);

  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return 'loopback-address';
  if (host === '::' || host === '0:0:0:0:0:0:0:0') return 'reserved-address';

  // IPv4-mapped / IPv4-compatible addresses smuggle an IPv4 target inside IPv6.
  const mapped = host.match(/(?:::ffff:|::)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (mapped?.[1]) {
    const octets = parseIpv4(mapped[1]);
    if (octets) return classifyIpv4(octets) ?? 'reserved-address';
  }

  // fe80::/10 link-local
  if (/^fe[89ab][0-9a-f]:/.test(host)) return 'link-local-address';
  // fc00::/7 unique local
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return 'unique-local-address';
  // ff00::/8 multicast
  if (/^ff[0-9a-f]{2}:/.test(host)) return 'reserved-address';
  // 64:ff9b::/96 NAT64 — can translate to any IPv4 including private space.
  if (host.startsWith('64:ff9b:')) return 'reserved-address';

  return null;
}

function looksLikeIpv6(host: string): boolean {
  return host.includes(':');
}

/**
 * Validates a hostname or IP literal. Exported separately so the redirect
 * handler and DNS-resolution check can reuse it.
 */
export function classifyHost(host: string): UrlRejectionReason | null {
  const hostname = host.toLowerCase().replace(/\.$/, '');

  if (hostname.length === 0) return 'missing-hostname';

  if (looksLikeIpv6(hostname)) {
    return classifyIpv6(hostname);
  }

  const ipv4 = parseIpv4(hostname);
  if (ipv4) {
    return classifyIpv4(ipv4);
  }

  // Decimal / octal / hex integer forms of an IPv4 address, e.g. 2130706433.
  if (/^\d+$/.test(hostname) || /^0x[0-9a-f]+$/.test(hostname)) {
    return 'reserved-address';
  }

  if (BLOCKED_HOSTNAMES.has(hostname)) return 'internal-hostname';
  if (BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return 'internal-hostname';

  // A bare single-label hostname (no dot) is an internal name by definition.
  if (!hostname.includes('.')) return 'internal-hostname';

  return null;
}

export type GuardOptions = {
  /** Development escape hatch, gated behind ALLOW_PRIVATE_NETWORK_FETCH. */
  allowPrivateNetwork?: boolean;
};

/**
 * Validates a user-submitted URL before any network access happens.
 */
export function guardUrl(input: string, options: GuardOptions = {}): UrlGuardResult {
  if (typeof input !== 'string' || input.trim().length === 0) return reject('invalid-url');
  const trimmed = input.trim();
  if (trimmed.length > MAX_URL_LENGTH) return reject('url-too-long');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return reject('invalid-url');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return reject('unsupported-protocol');
  }

  if (url.username.length > 0 || url.password.length > 0) {
    return reject('credentials-in-url');
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    return reject('blocked-port');
  }

  if (url.hostname.length === 0) {
    return reject('missing-hostname');
  }

  if (options.allowPrivateNetwork) {
    // Still enforce protocol, credentials and port rules above.
    return { ok: true, url };
  }

  const problem = classifyHost(url.hostname);
  if (problem) return reject(problem);

  return { ok: true, url };
}

/**
 * Second-stage check applied to every address DNS resolves the hostname to.
 * A public hostname with an A record pointing at 10.0.0.1 is the classic bypass;
 * this closes it.
 */
export function guardResolvedAddresses(
  addresses: string[],
  options: GuardOptions = {},
): UrlGuardResult | null {
  if (options.allowPrivateNetwork) return null;
  if (addresses.length === 0) return reject('missing-hostname');
  for (const address of addresses) {
    const problem = looksLikeIpv6(address)
      ? classifyIpv6(address)
      : (() => {
          const octets = parseIpv4(address);
          return octets ? classifyIpv4(octets) : 'reserved-address';
        })();
    if (problem) return reject(problem);
  }
  return null;
}
