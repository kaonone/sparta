import * as React from 'react';
import { GetProps } from '_helpers';
import BN from 'bn.js';
import { FieldRenderProps } from 'react-final-form';

import { useTranslate } from 'services/i18n';
import { getFieldWithComponent } from 'utils/react';

import { TextInput, DecimalsInput } from '../inputs';

interface IOwnProps {
  baseDecimals: number;
  baseUnitName: string;
  maxValue?: BN;
  withSelect?: boolean;
}

type IProps = Omit<GetProps<typeof TextInput>, 'ref'> &
  FieldRenderProps<any, HTMLElement> &
  IOwnProps;

function DecimalsFieldComponent(props: IProps) {
  const { input, meta, ...rest } = props;
  const { t } = useTranslate();

  const error =
    typeof rest.error === 'boolean'
      ? rest.error && meta.error && t(meta.error)
      : meta.touched && meta.error && t(meta.error);

  return <DecimalsInput {...rest} helperText={error} error={Boolean(error)} {...input} />;
}

export const DecimalsField = getFieldWithComponent(DecimalsFieldComponent);
