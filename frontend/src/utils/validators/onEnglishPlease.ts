import { tKeys, ITranslateKey } from 'services/i18n';

export function onEnglishPlease(value: string): ITranslateKey | undefined {
  const validationRegExp = new RegExp(`^([\\w\\s,.!:'"])+$`);
  return value && !validationRegExp.test(value)
    ? tKeys.utils.validation.onEnglishPlease.getKey()
    : undefined;
}
