import BN from 'bn.js';

export function decimalsToWei(decimals: number) {
  return new BN(10).pow(new BN(decimals));
}
