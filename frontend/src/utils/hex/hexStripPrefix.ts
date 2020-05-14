import { isHex } from './isHex';

const UNPREFIX_HEX_REGEX = /^[a-fA-F0-9]+$/;

export function hexStripPrefix(value?: string | null): string {
  if (!value) {
    return '';
  }

  const hasPrefix = !!(value && isHex(value, -1, true) && value.substr(0, 2) === '0x');

  if (hasPrefix) {
    return value.substr(2);
  }

  if (UNPREFIX_HEX_REGEX.test(value)) {
    return value;
  }

  throw new Error(`Invalid hex ${value} passed to hexStripPrefix`);
}
