import BN from 'bn.js';

import { ToBn } from 'utils/types';

import { isToBn } from './isToBn';
import { isHex } from '../hex/isHex';
import { hexToBn } from '../hex/hexToBn';

export function bnToBn<ExtToBn extends ToBn>(value?: ExtToBn | BN | string | number | null): BN {
  if (!value) {
    return new BN(0);
  }
  if (isHex(value, undefined, true)) {
    return hexToBn(value.toString());
  }

  const convertedToBnValue = isToBn(value) ? value.toBn() : new BN(value);

  return BN.isBN(value) ? value : convertedToBnValue;
}
