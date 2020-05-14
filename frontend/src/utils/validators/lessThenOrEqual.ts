import BN from 'bn.js';

import { tKeys, ITranslateKey } from 'services/i18n';

export function lessThenOrEqual(
  value: number | BN,
  currentValue: string | number,
  formatValue?: (value: number | BN) => string,
  errorKey?: string,
): ITranslateKey | undefined {
  const isValid = BN.isBN(value) ? value.gte(new BN(currentValue)) : Number(currentValue) <= value;

  return isValid
    ? undefined
    : {
        key: errorKey || tKeys.utils.validation.lessThenOrEqual.getKey(),
        params: { value: formatValue ? formatValue(value) : String(value) },
      };
}
