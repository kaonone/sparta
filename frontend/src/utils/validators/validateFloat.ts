import { tKeys } from 'services/i18n';

const floatRegExp = /^-?\d+?([.]|[.]\d+)?$/;

function makeFloatDecimalsRegExp(decimals: number) {
  return new RegExp(`^-?\\d+?([.]|[.]\\d{1,${decimals}})?$`);
}

export const validateFloat = (decimals: number) => (value: string) => {
  return (
    (!floatRegExp.test(value) && tKeys.utils.validation.isNumber.getKey()) ||
    (!makeFloatDecimalsRegExp(decimals).test(value) && {
      key: tKeys.utils.validation.decimalsMoreThen.getKey(),
      params: { decimals },
    }) ||
    undefined
  );
};
