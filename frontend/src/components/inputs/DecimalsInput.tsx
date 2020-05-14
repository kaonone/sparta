import * as React from 'react';
import { GetProps } from '_helpers';
import BN from 'bn.js';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';

import { fromBaseUnit, toBaseUnit } from 'utils/bn';

import { TextInput } from './TextInput';

interface IOwnProps {
  baseDecimals: number;
  baseUnitName?: string;
  value: string;
  maxValue?: BN;
  onChange: (value: string) => void;
}

type IProps = IOwnProps & Omit<GetProps<typeof TextInput>, 'ref'>;

function DecimalsInput(props: IProps) {
  const {
    onChange,
    baseDecimals,
    value,
    maxValue,
    baseUnitName,
    disabled,
    ...restInputProps
  } = props;

  const [suffix, setSuffix] = React.useState('');

  const amount = React.useMemo(() => value && fromBaseUnit(value, baseDecimals) + suffix, [
    value,
    suffix,
    baseDecimals,
  ]);

  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const maxFractionLength = baseDecimals;
      const inputValidationRegExp = new RegExp(
        `^$|^\\d+?${maxFractionLength > 0 ? `(\\.?\\d{0,${maxFractionLength}})` : ''}$`,
      );

      if (inputValidationRegExp.test(event.target.value)) {
        const suffixMatch = event.target.value.match(/^.+?((\.|\.0*)|(\.[1-9]*(0*)))$/);

        if (suffixMatch) {
          const [, , dotWithZeros, , zerosAfterDot] = suffixMatch;
          setSuffix(dotWithZeros || zerosAfterDot || '');
        } else {
          setSuffix('');
        }

        onChange(event.target.value && toBaseUnit(event.target.value, baseDecimals).toString());
      }
    },
    [baseDecimals],
  );

  const handleMaxButtonClick = React.useCallback(() => {
    setSuffix('');
    maxValue && onChange(maxValue.toString());
  }, [onChange, maxValue && maxValue.toString()]);

  return (
    <>
      <Grid container spacing={1}>
        <Grid item xs={10}>
          <TextInput
            {...restInputProps}
            disabled={disabled}
            value={amount}
            variant="outlined"
            fullWidth
            onChange={handleInputChange}
            InputProps={{
              endAdornment: maxValue && (
                <Button disabled={disabled} color="primary" onClick={handleMaxButtonClick}>
                  MAX
                </Button>
              ),
            }}
          />
        </Grid>
        {baseUnitName && (
          <Grid item xs={2}>
            <TextInput disabled value={baseUnitName} variant="outlined" fullWidth />
          </Grid>
        )}
      </Grid>
    </>
  );
}

export { DecimalsInput };
