import BN from 'bn.js';

import { bnToBn } from 'utils/bn/bnToBn';

import { formatDecimal } from './formatDecimal';

interface IFormatBalanceOptions {
  amountInBaseUnits: string | BN;
  baseDecimals: number;
  tokenSymbol?: string;
  precision?: number;
  variant?: 'short' | 'long';
}

export function formatBalance({
  amountInBaseUnits,
  baseDecimals,
  tokenSymbol = '',
  precision = 2,
  variant = 'long',
}: IFormatBalanceOptions): string {
  let balanceString = bnToBn(amountInBaseUnits).toString();

  const units = ` ${tokenSymbol}`;

  if (balanceString.length === 0 || balanceString === '0') {
    return `0${units.trimEnd()}`;
  }

  const isNegative = balanceString[0].startsWith('-');

  if (isNegative) {
    balanceString = balanceString.substr(1);
  }

  const mid = balanceString.length - baseDecimals;
  const prefix = balanceString.substr(0, mid);
  const padding = mid < 0 ? 0 - mid : 0;
  const decimalsZerosLength = baseDecimals < precision ? baseDecimals : precision;

  const postfix = `${`${'0'.repeat(padding)}${balanceString}`.substr(mid < 0 ? 0 : mid)}000`.substr(
    0,
    decimalsZerosLength,
  );

  const long = `${isNegative ? '-' : ''}${formatDecimal(prefix || '0')}${
    baseDecimals ? `.${postfix}` : ''
  }`;
  const short = long.replace(/^(\d+?\.\d*?)0*$/, '$1').replace(/^(\d+?)\.$/, '$1');

  return `${variant === 'short' ? short : long}${units.trimEnd()}`;
}
