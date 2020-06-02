/* eslint-disable no-param-reassign */
import { memoizeWith, always } from 'ramda';

const initial = Symbol('initial');

export function memoize(by?: (...args: any[]) => string) {
  return (target: any, name: string, descriptor: PropertyDescriptor) => {
    if (typeof descriptor.value === 'function') {
      return memoizeMethod(target, name, descriptor.value, descriptor, by);
    }
    if (typeof descriptor.get === 'function') {
      return memoizeGetter(target, name, descriptor.get, descriptor);
    }
    throw new Error(
      `@memoize decorator can be applied to methods or getters, got ${String(
        descriptor.value,
      )} instead`,
    );
  };
}

function memoizeGetter(
  target: any,
  name: string,
  getter: () => any,
  descriptor: PropertyDescriptor,
) {
  const memoizedName = Symbol(`_memoized_${name}`);
  target[memoizedName] = initial;

  return {
    ...descriptor,
    get(this: any): any {
      if (this[memoizedName] === initial) {
        this[memoizedName] = memoizeWith(always('result'), getter.bind(this));
      }
      return this[memoizedName]();
    },
  };
}

function memoizeMethod(
  target: any,
  name: string,
  method: (...args: []) => any,
  descriptor: PropertyDescriptor,
  by?: (...args: any[]) => string,
) {
  const memoizedName = Symbol(`_memoized_${name}`);
  target[memoizedName] = initial;
  return {
    ...descriptor,
    value(this: any, ...args: []) {
      if (this[memoizedName] === initial) {
        this[memoizedName] = memoizeWith(by || always('result'), method.bind(this));
      }
      return this[memoizedName](...args);
    },
  };
}
