import { describe, expect, it } from 'vitest';
import { TOKEN, TOKEN_FACTS } from '@/content/token';

/**
 * Guards on the published contract address.
 *
 * This is the single most security-critical string in the codebase. A reader who
 * copies a corrupted address loses money, and the corruption modes are quiet: a
 * transposed character, a link updated while the constant was not, a "cleanup"
 * that shortens the display. Each is caught below.
 */

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58(input: string): Uint8Array {
  let value = 0n;
  for (const character of input) {
    const index = BASE58.indexOf(character);
    if (index < 0) throw new Error(`not base58: ${character}`);
    value = value * 58n + BigInt(index);
  }
  const bytes: number[] = [];
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn));
    value >>= 8n;
  }
  for (const character of input) {
    if (character !== '1') break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

describe('RFOLD contract address', () => {
  it('is a well-formed Solana public key', () => {
    // Base58 deliberately excludes 0, O, I and l because they are confusable.
    // A character outside the alphabet means the address was mistyped.
    for (const character of TOKEN.mint) {
      expect(BASE58, `"${character}" is not a base58 character`).toContain(character);
    }
    expect(decodeBase58(TOKEN.mint)).toHaveLength(32);
  });

  it('matches the address read from Solana mainnet', () => {
    // Pinned literal. If someone edits the constant, this fails and the change
    // has to be justified rather than slipping through in a large diff.
    expect(TOKEN.mint).toBe('GCosMmwoMRwtLiMpb2tmmZyvwLzXU758iUKr1YXjyory');
  });

  it('points every explorer link at that exact address', () => {
    for (const [name, href] of Object.entries(TOKEN.links)) {
      if (name === 'orynth') continue;
      expect(href, `${name} link does not carry the mint`).toContain(TOKEN.mint);
      // A link containing a *different* 44-character base58 string would be a
      // successful redirect to the wrong token, so check nothing else looks
      // like an address.
      const candidates = href.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) ?? [];
      for (const candidate of candidates) {
        if (candidate.length === 44) expect(candidate).toBe(TOKEN.mint);
      }
    }
  });

  it('states only supply facts that match a fixed-supply mint', () => {
    // On-chain: decimals 6, raw supply 500000000000. The two must agree, or the
    // page is quoting a supply the chain does not have.
    expect(TOKEN.decimals).toBe(6);
    expect(TOKEN.totalSupply * 10 ** TOKEN.decimals).toBe(500_000_000_000);
    expect(TOKEN_FACTS.find((fact) => fact.label === 'Supply')?.value).toBe('500,000');
  });

  it('makes no price, return or investment claim', () => {
    const prose = TOKEN_FACTS.map((fact) => `${fact.label} ${fact.value} ${fact.note}`)
      .join(' ')
      .toLowerCase();
    for (const forbidden of ['price', 'return', 'profit', 'guaranteed', 'moon', 'invest', '100x']) {
      expect(prose, `token copy should not claim "${forbidden}"`).not.toContain(forbidden);
    }
  });
});
