import BN from 'bn.js';

import { ToBn } from 'utils/types';
import { bnToBn } from 'utils/bn';

import { formatDecimal } from './formatDecimal';

export function formatNumber<ExtToBn extends ToBn>(value?: ExtToBn | BN | number | null): string {
  return formatDecimal(bnToBn(value).toString());
}
