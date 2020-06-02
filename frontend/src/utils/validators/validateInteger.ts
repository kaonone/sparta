import { tKeys } from 'services/i18n';

export const validateInteger = (value: string) => {
  const numberMessage = tKeys.utils.validation.isNumber.getKey();
  const integerMessage = tKeys.utils.validation.mustBeAnInteger.getKey();

  return (
    (Number.isNaN(Number(value)) && numberMessage) ||
    (!Number.isInteger(Number(value)) && integerMessage) ||
    undefined
  );
};
