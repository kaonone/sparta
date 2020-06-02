import BN from 'bn.js';

export function compareBn(prev: BN | null | undefined, current: BN | null | undefined) {
  return Boolean(
    (!prev && current) || (prev && !current) || (prev && current && !prev.eq(current)),
  );
}
