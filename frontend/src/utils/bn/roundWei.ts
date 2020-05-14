import BN from 'bn.js';

import { decimalsToWei } from './decimalsToWei';

export function roundWei(
  value: string | BN,
  decimals: number,
  variant: 'ceil' | 'floor',
  significant: number,
): BN {
  const weiDecimals = decimalsToWei(Math.max(0, decimals - significant));

  const bnValue = new BN(value);

  const floorRounded = bnValue.div(weiDecimals).mul(weiDecimals);

  const isNeedUpToCeil = variant === 'ceil' && !bnValue.eq(floorRounded);

  return floorRounded.add(isNeedUpToCeil ? weiDecimals : new BN(0));
}
