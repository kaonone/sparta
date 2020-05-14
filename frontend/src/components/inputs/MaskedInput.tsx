import * as React from 'react';
import * as R from 'ramda';
import { GetProps } from '_helpers';
import ReactTextMask from 'react-text-mask';
import { InputBaseComponentProps } from '@material-ui/core/InputBase';
import InputAdornment from '@material-ui/core/InputAdornment';

import { MoneyIcon } from '../icons';
import { TextInput, IProps as ITextInputProps } from './TextInput';

type MaskType = 'visa';

type IProps = ITextInputProps & {
  maskType: MaskType;
};

const maskByType: Record<MaskType, GetProps<typeof ReactTextMask>['mask']> = {
  visa: [
    /\d/,
    /\d/,
    /\d/,
    /\d/,
    ' ',
    /\d/,
    /\d/,
    /\d/,
    /\d/,
    ' ',
    /\d/,
    /\d/,
    /\d/,
    /\d/,
    ' ',
    /\d/,
    /\d/,
    /\d/,
    /\d/,
  ],
};

const makeMaskInput = R.memoizeWith(R.identity, (maskType: MaskType) => {
  return function TextMaskCustom(props: InputBaseComponentProps) {
    const { inputRef, value, defaultValue, ...other } = props;

    return (
      <ReactTextMask
        {...other}
        value={value as GetProps<typeof ReactTextMask>['value']}
        defaultValue={defaultValue as GetProps<typeof ReactTextMask>['defaultValue']}
        ref={inputRef}
        mask={maskByType[maskType]}
        showMask
      />
    );
  };
});

class MaskedInput extends React.PureComponent<IProps> {
  public render() {
    const { maskType, InputProps, ...restProps } = this.props;

    return (
      <TextInput
        {...restProps}
        InputLabelProps={{
          ...restProps.InputLabelProps,
          shrink: true,
        }}
        InputProps={{
          ...InputProps,
          inputComponent: makeMaskInput(maskType),
          endAdornment: (InputProps && InputProps.endAdornment) || this.renderEndAdornment(),
        }}
      />
    );
  }

  private renderEndAdornment(): React.ReactNode {
    const { maskType } = this.props;

    if (maskType === 'visa') {
      return (
        <InputAdornment position="end">
          <MoneyIcon />
        </InputAdornment>
      );
    }

    return <></>;
  }
}

export { MaskedInput };
