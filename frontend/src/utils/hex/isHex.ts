const HEX_REGEX = /^0x[a-fA-F0-9]+$/;

export function isHex(value: any, bitLength = -1, ignoreLength = false): value is string | String {
  const isValidHex =
    value === '0x' ||
    ((typeof value === 'string' || value instanceof String) && HEX_REGEX.test(value.toString()));

  if (isValidHex && bitLength !== -1) {
    return value.length === 2 + Math.ceil(bitLength / 4);
  }

  return isValidHex && (ignoreLength || value.length % 2 === 0);
}
