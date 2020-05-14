import { tKeys, ITranslateKey } from 'services/i18n';

export function maxStringLength(max: number, value: string): ITranslateKey | undefined {
  return max < value.length
    ? { key: tKeys.utils.validation.maxStringLength.getKey(), params: { max: max + 1 } }
    : undefined;
}
