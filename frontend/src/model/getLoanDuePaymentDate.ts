import BN from 'bn.js';

export function getLoanDuePaymentDate(
  lastUpdate: string | null | undefined,
  paymentTimeout: BN,
): Date | null {
  return lastUpdate ? new Date(new BN(lastUpdate).add(paymentTimeout).toNumber() * 1000) : null;
}
