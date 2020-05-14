import React, { useCallback } from 'react';
import { FieldRenderProps } from 'react-final-form';
import { GetProps } from '_helpers';

import { useTranslate } from 'services/i18n';
import { getFieldWithComponent } from 'utils/react';

import { NumberInput } from '../inputs';

type IProps = Omit<GetProps<typeof NumberInput>, 'ref'> & FieldRenderProps<any, HTMLElement>;

function NumberInputFieldComponent(props: IProps) {
  const { input, meta, ...rest } = props;
  const { t } = useTranslate();
  const error =
    typeof rest.error === 'boolean'
      ? rest.error && meta.error && t(meta.error)
      : meta.touched && meta.error && t(meta.error);

  const onChange: GetProps<typeof NumberInput>['onChange'] = useCallback(
    value => input.onChange(value.floatValue),
    [input.onChange],
  );

  return (
    <NumberInput
      {...rest}
      helperText={error}
      error={Boolean(error)}
      {...input}
      onChange={onChange}
    />
  );
}

export const NumberInputField = getFieldWithComponent(NumberInputFieldComponent);
