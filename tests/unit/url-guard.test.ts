import { describe, expect, it } from 'vitest';
import {
  classifyHost,
  classifyIpv4,
  classifyIpv6,
  guardResolvedAddresses,
  guardUrl,
  parseIpv4,
} from '@/lib/retrieval/url-guard';

/**
 * SSRF guard tests.
 *
 * These are the highest-value tests in the suite: the guard is the only thing
 * standing between a user-submitted string and the server's network position,
 * so every bypass technique worth knowing about gets an explicit case.
 */

describe('parseIpv4', () => {
  it('parses a dotted quad', () => {
    expect(parseIpv4('192.168.1.1')).toEqual([192, 168, 1, 1]);
  });

  it('rejects out-of-range octets', () => {
    expect(parseIpv4('256.1.1.1')).toBeNull();
  });

  it('rejects the wrong number of parts', () => {
    expect(parseIpv4('1.2.3')).toBeNull();
    expect(parseIpv4('1.2.3.4.5')).toBeNull();
  });

  it('rejects non-numeric parts', () => {
    expect(parseIpv4('a.b.c.d')).toBeNull();
  });
});

describe('classifyIpv4', () => {
  it.each([
    ['127.0.0.1', 'loopback-address'],
    ['127.255.255.254', 'loopback-address'],
    ['10.0.0.1', 'private-address'],
    ['172.16.0.1', 'private-address'],
    ['172.31.255.255', 'private-address'],
    ['192.168.0.1', 'private-address'],
    ['169.254.169.254', 'link-local-address'],
    ['100.64.0.1', 'private-address'],
    ['0.0.0.0', 'reserved-address'],
    ['224.0.0.1', 'reserved-address'],
    ['255.255.255.255', 'reserved-address'],
    ['198.18.0.1', 'reserved-address'],
  ])('blocks %s', (address, reason) => {
    const octets = parseIpv4(address);
    expect(octets).not.toBeNull();
    expect(classifyIpv4(octets!)).toBe(reason);
  });

  it.each([['8.8.8.8'], ['1.1.1.1'], ['172.32.0.1'], ['192.167.0.1'], ['93.184.216.34']])(
    'allows public address %s',
    (address) => {
      const octets = parseIpv4(address);
      expect(classifyIpv4(octets!)).toBeNull();
    },
  );
});

describe('classifyIpv6', () => {
  it.each([
    ['::1', 'loopback-address'],
    ['0:0:0:0:0:0:0:1', 'loopback-address'],
    ['::', 'reserved-address'],
    ['fe80::1', 'link-local-address'],
    ['fc00::1', 'unique-local-address'],
    ['fd12:3456::1', 'unique-local-address'],
    ['ff02::1', 'reserved-address'],
    ['64:ff9b::1.2.3.4', 'reserved-address'],
  ])('blocks %s', (address, reason) => {
    expect(classifyIpv6(address)).toBe(reason);
  });

  it('blocks IPv4-mapped loopback', () => {
    expect(classifyIpv6('::ffff:127.0.0.1')).toBe('loopback-address');
  });

  it('blocks IPv4-mapped private space', () => {
    expect(classifyIpv6('::ffff:10.0.0.1')).toBe('private-address');
    expect(classifyIpv6('::ffff:169.254.169.254')).toBe('link-local-address');
  });

  it('allows a public IPv6 address', () => {
    expect(classifyIpv6('2606:4700:4700::1111')).toBeNull();
  });
});

describe('classifyHost', () => {
  it.each([
    ['localhost'],
    ['LOCALHOST'],
    ['metadata.google.internal'],
    ['kubernetes.default.svc'],
    ['something.local'],
    ['api.internal'],
    ['db.cluster.local'],
    ['host'],
  ])('blocks internal hostname %s', (host) => {
    expect(classifyHost(host)).toBe('internal-hostname');
  });

  it('blocks integer-encoded IPv4', () => {
    expect(classifyHost('2130706433')).toBe('reserved-address');
    expect(classifyHost('0x7f000001')).toBe('reserved-address');
  });

  it('allows a normal public hostname', () => {
    expect(classifyHost('example.com')).toBeNull();
    expect(classifyHost('docs.example.co.uk')).toBeNull();
  });

  it('ignores a trailing root dot', () => {
    expect(classifyHost('example.com.')).toBeNull();
  });
});

describe('guardUrl', () => {
  it('accepts a plain https URL', () => {
    const result = guardUrl('https://example.com/docs');
    expect(result.ok).toBe(true);
  });

  it('accepts http', () => {
    expect(guardUrl('http://example.com').ok).toBe(true);
  });

  it.each([
    ['file:///etc/passwd', 'unsupported-protocol'],
    ['ftp://example.com', 'unsupported-protocol'],
    ['gopher://example.com', 'unsupported-protocol'],
    ['javascript:alert(1)', 'unsupported-protocol'],
    ['data:text/html,<script>', 'unsupported-protocol'],
  ])('rejects %s', (url, reason) => {
    const result = guardUrl(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe(reason);
  });

  it('rejects embedded credentials', () => {
    const result = guardUrl('https://user:pass@example.com');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('credentials-in-url');
  });

  it('rejects non-standard ports', () => {
    const result = guardUrl('https://example.com:22');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('blocked-port');
  });

  it('allows standard alternate ports', () => {
    expect(guardUrl('https://example.com:8443').ok).toBe(true);
    expect(guardUrl('http://example.com:8080').ok).toBe(true);
  });

  it('rejects loopback and private hosts', () => {
    expect(guardUrl('http://127.0.0.1:8080').ok).toBe(false);
    expect(guardUrl('http://localhost:3000').ok).toBe(false);
    expect(guardUrl('http://10.0.0.5').ok).toBe(false);
    expect(guardUrl('http://[::1]').ok).toBe(false);
  });

  it('rejects the cloud metadata endpoint', () => {
    const result = guardUrl('http://169.254.169.254/latest/meta-data/');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('link-local-address');
  });

  it('rejects garbage and over-long input', () => {
    expect(guardUrl('not a url').ok).toBe(false);
    expect(guardUrl('').ok).toBe(false);
    expect(guardUrl(`https://example.com/${'a'.repeat(4000)}`).ok).toBe(false);
  });

  it('still enforces protocol and port when private network access is allowed', () => {
    expect(guardUrl('file:///etc/passwd', { allowPrivateNetwork: true }).ok).toBe(false);
    expect(guardUrl('https://example.com:22', { allowPrivateNetwork: true }).ok).toBe(false);
    // The escape hatch only relaxes the address classification.
    expect(guardUrl('http://127.0.0.1:8080', { allowPrivateNetwork: true }).ok).toBe(true);
  });
});

describe('guardResolvedAddresses', () => {
  it('passes public addresses', () => {
    expect(guardResolvedAddresses(['93.184.216.34', '2606:4700::1111'])).toBeNull();
  });

  it('blocks a public hostname that resolves into private space', () => {
    const result = guardResolvedAddresses(['93.184.216.34', '10.0.0.1']);
    expect(result).not.toBeNull();
    expect(result?.ok).toBe(false);
  });

  it('blocks a DNS rebind to loopback', () => {
    const result = guardResolvedAddresses(['127.0.0.1']);
    expect(result?.ok).toBe(false);
  });

  it('blocks an empty resolution', () => {
    expect(guardResolvedAddresses([])?.ok).toBe(false);
  });

  it('is bypassed only by the explicit development flag', () => {
    expect(guardResolvedAddresses(['127.0.0.1'], { allowPrivateNetwork: true })).toBeNull();
  });
});
