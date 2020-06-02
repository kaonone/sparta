import { ITranslateKey } from 'services/i18n';

type ValidationError = string | ITranslateKey;
type Validator<T> = (value: T) => ValidationError | undefined;

export function composeValidators<T>(...validators: Array<Validator<T>>) {
  return (value: T) =>
    validators.reduce<ValidationError | undefined>(
      (error, validator) => error || validator(value),
      undefined,
    );
}
