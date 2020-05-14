import BN from 'bn.js';

const zero = new BN(0);
const negative1 = new BN(-1);

export function fromBaseUnit(input: BN | string, decimals: number): string {
  let wei = new BN(input);
  const negative = wei.lt(zero);
  const base = new BN(10).pow(new BN(decimals));

  if (negative) {
    wei = wei.mul(negative1);
  }

  let fraction = wei.mod(base).toString(10);

  while (fraction.length < decimals) {
    fraction = `0${fraction}`;
  }

  fraction = fraction.replace(/^(.+?)0+$/, '$1');

  const whole = wei.div(base).toString(10);

  let value = `${whole}${fraction === '0' ? '' : `.${fraction}`}`;

  if (negative) {
    value = `-${value}`;
  }

  return value;
}
