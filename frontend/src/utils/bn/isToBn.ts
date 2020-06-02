import { ToBn } from 'utils/types';

export function isToBn(value?: any): value is ToBn {
  return !!value && typeof (value as ToBn).toBn === 'function';
}
