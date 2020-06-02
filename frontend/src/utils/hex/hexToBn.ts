import BN from 'bn.js';

import { hexStripPrefix } from './hexStripPrefix';

interface ToBnOptions {
  isLe?: boolean;
  isNegative?: boolean;
}

function reverse(value: string): string {
  return (value.match(new RegExp('.{1,2}', 'g')) || []).reverse().join('');
}

export function hexToBn(
  value?: string | number | null,
  options: ToBnOptions | boolean = { isLe: false, isNegative: false },
): BN {
  if (!value) {
    return new BN(0);
  }

  const newOptions: ToBnOptions = {
    isLe: false,
    isNegative: false,
    ...(typeof options === 'boolean' ? { isLe: options } : options),
  };

  const newValue = hexStripPrefix(value as string);
  const bn = new BN((newOptions.isLe ? reverse(newValue) : newValue) || '00', 16);

  return newOptions.isNegative ? bn.fromTwos(newValue.length * 4) : bn;
}
