import BN from 'bn.js';

export function calculateGrowth(previous: BN, current: BN) {
  return current
    .sub(previous)
    .abs()
    .muln(100)
    .div(previous);
}
