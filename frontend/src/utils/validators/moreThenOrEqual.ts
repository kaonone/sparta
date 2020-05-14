import BN from 'bn.js';

import { tKeys, ITranslateKey } from 'services/i18n';

export function moreThenOrEqual(
  value: number | BN,
  currentValue: string | number,
  formatValue?: (value: number | BN) => string,
): ITranslateKey | undefined {
  const isValid = BN.isBN(value) ? value.lte(new BN(currentValue)) : Number(currentValue) >= value;

  return isValid
    ? undefined
    : {
        key: tKeys.utils.validation.moreThenOrEqual.getKey(),
        params: { value: formatValue ? formatValue(value) : String(value) },
      };
}
