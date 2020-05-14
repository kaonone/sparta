import BN from 'bn.js';

const negative1 = new BN(-1);

export function toBaseUnit(input: string, decimals: number): BN {
  let inputStr = input;
  const base = new BN(10).pow(new BN(decimals));

  // Is it negative?
  const negative = inputStr.substring(0, 1) === '-';
  if (negative) {
    inputStr = inputStr.substring(1);
  }

  if (inputStr === '.') {
    throw new Error(`While converting number "${input}" to base units, invalid value`);
  }

  // Split it into a whole and fractional part
  const comps = inputStr.split('.');
  if (comps.length > 2) {
    throw new Error(`While converting number "${input}" to base units, too many decimal points`);
  }

  let whole = comps[0];
  let fraction = comps[1];

  if (!whole) {
    whole = '0';
  }
  if (!fraction) {
    fraction = '';
  }
  if (fraction.length > decimals) {
    throw new Error(`While converting number "${input}" to base units, too many decimal places`);
  }

  while (fraction.length < decimals) {
    fraction += '0';
  }

  let inBaseUnit = new BN(whole).mul(base).add(new BN(fraction));

  if (negative) {
    inBaseUnit = inBaseUnit.mul(negative1);
  }

  return new BN(inBaseUnit.toString(10), 10);
}
