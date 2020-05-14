import BN from 'bn.js';

export function calcTotalWithdrawAmountByUserWithdrawAmount({
  userWithdrawAmountInDai,
  withdrawFeePercent,
  percentDivider,
}: {
  userWithdrawAmountInDai: string | BN;
  withdrawFeePercent: BN;
  percentDivider: BN;
}): BN {
  return new BN(userWithdrawAmountInDai)
    .mul(percentDivider)
    .div(percentDivider.sub(withdrawFeePercent));
}
