import BN from 'bn.js';

type Value = BN | string;

export function min(first: Value, ...rest: Array<Value>): BN {
  return rest.reduce<BN>((acc, cur) => {
    const accBn = new BN(acc);
    const curBn = new BN(cur);

    return accBn.lt(curBn) ? accBn : curBn;
  }, new BN(first));
}
