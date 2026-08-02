/**
 * The RFOLD token.
 *
 * Only immutable, on-chain-verifiable facts live here. Price, market cap,
 * holder count and liquidity all move minute to minute, so hardcoding them
 * would guarantee the page is wrong — anyone who wants those can follow the
 * explorer link and read them live.
 *
 * Every value below was read from Solana mainnet against the mint account and
 * can be re-checked by anyone:
 *   - `mintAuthority: null`   → the supply is fixed; no more can ever be minted
 *   - `freezeAuthority: null` → no account's balance can ever be frozen
 *   - `decimals: 6`, `supply: 500000000000` raw → 500,000 whole tokens
 */

export const TOKEN = {
  name: 'Routefold',
  symbol: 'RFOLD',
  chain: 'Solana',
  /** SPL mint address. This is the only address Routefold will ever publish. */
  mint: 'GCosMmwoMRwtLiMpb2tmmZyvwLzXU758iUKr1YXjyory',
  decimals: 6,
  /** Whole tokens. Fixed — the mint authority is revoked. */
  totalSupply: 500_000,
  launchpad: 'Orynth',
  links: {
    solscan: 'https://solscan.io/token/GCosMmwoMRwtLiMpb2tmmZyvwLzXU758iUKr1YXjyory',
    explorer:
      'https://explorer.solana.com/address/GCosMmwoMRwtLiMpb2tmmZyvwLzXU758iUKr1YXjyory',
    dexscreener:
      'https://dexscreener.com/solana/GCosMmwoMRwtLiMpb2tmmZyvwLzXU758iUKr1YXjyory',
    jupiter: 'https://jup.ag/swap/SOL-GCosMmwoMRwtLiMpb2tmmZyvwLzXU758iUKr1YXjyory',
    orynth: 'https://orynth.dev/projects/routefold',
  },
} as const;

/**
 * Properties a reader can confirm for themselves in one click. These are stated
 * as facts because they are permanent: a revoked authority cannot be restored.
 */
export const TOKEN_FACTS: ReadonlyArray<{ label: string; value: string; note: string }> = [
  {
    label: 'Supply',
    value: '500,000',
    note: 'Fixed. The mint authority is revoked, so no further tokens can be created.',
  },
  {
    label: 'Freeze authority',
    value: 'Revoked',
    note: 'No party can freeze a holder’s balance.',
  },
  {
    label: 'Decimals',
    value: '6',
    note: 'Standard SPL token precision.',
  },
  {
    label: 'Launchpad',
    value: 'Orynth',
    note: 'Launched through Orynth on a Meteora dynamic bonding curve.',
  },
];
