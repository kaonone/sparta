import BN from 'bn.js';

import { tKeys, ITranslateKey } from 'services/i18n';

type FormatValue = (value: number | BN) => string;

export function moreThen(
  value: number | BN,
  currentValue: string | number,
  formatValue?: FormatValue | undefined,
): ITranslateKey | undefined {
  const isValid = BN.isBN(value) ? value.lt(new BN(currentValue)) : Number(currentValue) > value;

  return isValid
    ? undefined
    : {
        key: tKeys.utils.validation.moreThen.getKey(),
        params: { value: formatValue ? formatValue(value) : String(value) },
      };
}
