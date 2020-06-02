import BN from 'bn.js';

import { decimalsToWei } from 'utils/bn';

export function calcInterestShare(
  userStake: string | BN,
  fullLoanStake: string | BN,
  outputDecimals: number = 0,
): BN {
  const weiDecimals = decimalsToWei(outputDecimals);
  return new BN(userStake)
    .muln(100)
    .mul(weiDecimals)
    .div(new BN(fullLoanStake));
}
