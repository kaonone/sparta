import * as React from 'react';
import { FieldRenderProps } from 'react-final-form';

import { useOnChangeState, getFieldWithComponent } from 'utils/react';

interface IOwnProps<T> {
  name: string;
  fieldValue: T; // final-form intercepts the 'value' property
  compare?: (prev: T, current: T) => boolean;
}

type Props<T> = FieldRenderProps<string, HTMLElement> & IOwnProps<T>;

const SpyFieldComponent = getFieldWithComponent<Props<any>>(function SpyFieldComponent<T>(
  props: Props<T>,
) {
  const { input, fieldValue, compare } = props;
  const { onChange } = input;

  useOnChangeState(fieldValue, compare || defaultCompare, (_prev, current) => onChange(current));

  return <noscript />;
});

function defaultCompare<T>(prev: T, current: T) {
  return prev === current;
}

function SpyField<T>(props: IOwnProps<T>) {
  return <SpyFieldComponent {...props} />;
}

export { SpyField };
