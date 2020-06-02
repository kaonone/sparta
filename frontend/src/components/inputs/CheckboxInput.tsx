import * as React from 'react';
import { CheckIdentity } from '_helpers';
import FormControl, { FormControlProps } from '@material-ui/core/FormControl';
import FormHelperText, { FormHelperTextProps } from '@material-ui/core/FormHelperText';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox, { CheckboxProps } from '@material-ui/core/Checkbox';

type IProps = CheckboxProps &
  Pick<FormControlProps, 'error' | 'required' | 'fullWidth'> & {
    label: React.ReactNode;
    helperText?: React.ReactNode;
    formHelperTextProps?: FormHelperTextProps;
  };

interface INormalizedProps {
  checkboxProps: CheckboxProps;
  formControlProps: FormControlProps;
  formHelperTextProps: FormHelperTextProps | null;
  other: {
    label: React.ReactNode | null;
    helperText: React.ReactNode;
  };
}

function CheckboxInput(props: IProps) {
  const { formControlProps, formHelperTextProps, checkboxProps, other } = normalizeProps(props);
  const { label, helperText } = other;

  return (
    <FormControl {...formControlProps}>
      <FormControlLabel
        control={<Checkbox {...checkboxProps} />}
        label={label + (checkboxProps.required ? ' *' : '')}
      />
      {helperText && <FormHelperText {...formHelperTextProps}>{helperText}</FormHelperText>}
    </FormControl>
  );
}

function normalizeProps(props: IProps): INormalizedProps {
  const { error, helperText = null, label, formHelperTextProps = null, fullWidth, ...rest } = props;

  const checkboxProps: CheckIdentity<CheckboxProps, typeof rest> = rest;
  const formControlProps: FormControlProps = { error, required: rest.required, fullWidth };

  return {
    formHelperTextProps,
    formControlProps,
    checkboxProps,
    other: { label, helperText },
  };
}

export { CheckboxInput };
