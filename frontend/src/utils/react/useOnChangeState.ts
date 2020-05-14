import { useEffect, useRef } from 'react';

type Predicate<T> = (prevValue: T, value: T) => boolean;
type Handler<T> = (prevValue: T, value: T) => void;

export function useOnChangeState<T extends any>(
  value: T,
  predicate: Predicate<T>,
  handler: Handler<T>,
) {
  const valueRef = useRef(value);

  useEffect(() => {
    if (predicate(valueRef.current, value)) {
      handler(valueRef.current, value);
    }
    valueRef.current = value;
  }, [value]);
}
