import { tKeys, ITranslateKey } from 'services/i18n';

export function isRequired(value: any): ITranslateKey | undefined {
  return !value ? tKeys.utils.validation.isRequired.getKey() : undefined;
}
