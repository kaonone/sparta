import React from 'react';
import { Form, FormSpy } from 'react-final-form';
import createCalculateDecorator from 'final-form-calculate';

import { useApi, Protocol } from 'services/api';
import { Typography, Loading, Grid, MenuItem, Hint, Button } from 'components';
import { TextInputField, DecimalsField } from 'components/form';
import { useSubscribable } from 'utils/react';
import { decimalsToWei } from 'utils/bn';
import { ETH_NETWORK_CONFIG } from 'env';
import { isRequired, moreThen } from 'utils/validators';
import { ITranslateKey } from 'services/i18n';

export const SwapOptionsForm = React.memo(function SwapOptionsForm({
  onSubmit,
}: SwapOptionsFormProps) {
  const api = useApi();
  const [sourceTokenInfo, sourceTokenInfoMeta] = useSubscribable(
    () => api.tokens.getTokenInfo$('dai'),
    [],
  );

  const slippageDecimals = 2;
  const [initialValues, setInitialValues] = React.useState<SwapFormData>(() => ({
    amountIn: '0',
    additionalSlippageFrom: decimalsToWei(slippageDecimals).toString(),
    additionalSlippageTo: decimalsToWei(slippageDecimals).toString(),
    slippageDecimals,
    protocolFrom: 'balancer',
    protocolTo: 'uniswap-v2',
    tokenFrom: ETH_NETWORK_CONFIG.contracts.dai,
    tokenTo:
      ETH_NETWORK_CONFIG.contracts.swapTokens[
        Object.keys(ETH_NETWORK_CONFIG.contracts.swapTokens)[0]
      ],
  }));

  const handleFormSubmit = React.useCallback(
    (values: SwapFormData) => {
      setInitialValues(values);
      onSubmit(values);
    },
    [onSubmit],
  );

  return (
    <Form
      decorators={decorators}
      validate={validate}
      onSubmit={handleFormSubmit}
      initialValues={initialValues}
      subscription={{
        submitError: true,
        dirtySinceLastSubmit: true,
        dirty: true,
      }}
    >
      {({ handleSubmit, submitError, dirtySinceLastSubmit, dirty, form: { reset } }) => (
        <form onSubmit={handleSubmit}>
          <Grid container justify="center" spacing={2}>
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={2}>
                <Grid item>Buy</Grid>
                <Grid item>
                  <TextInputField select variant="outlined" label="token" name={fieldNames.tokenTo}>
                    {tokensOptions.map(({ label, value }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextInputField>
                </Grid>
                <Grid item>in</Grid>
                <Grid item>
                  <TextInputField
                    select
                    variant="outlined"
                    label="protocol"
                    name={fieldNames.protocolFrom}
                  >
                    {protocolsOptions.map(({ label, value }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextInputField>
                </Grid>
                <Grid item>for</Grid>
                <Grid item>
                  <Loading meta={sourceTokenInfoMeta}>
                    {sourceTokenInfo && (
                      <DecimalsField
                        baseDecimals={sourceTokenInfo.decimals}
                        baseUnitName={sourceTokenInfo.symbol}
                        name={fieldNames.amountIn}
                        label="swap amount"
                      />
                    )}
                  </Loading>
                </Grid>
                <Grid item>and sell them at</Grid>
                <Grid item>
                  <TextInputField
                    select
                    variant="outlined"
                    label="protocol"
                    name={fieldNames.protocolTo}
                  >
                    {protocolsOptions.map(({ label, value }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextInputField>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={6}>
              <FormSpy<SwapFormData> subscription={{ values: true }}>
                {({ values }) => (
                  <DecimalsField
                    baseDecimals={slippageDecimals}
                    baseUnitName="%"
                    name={fieldNames.additionalSlippageFrom}
                    label={`${getProtocolLabel(values.protocolFrom)} additional slippage`}
                    withSelect={false}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                )}
              </FormSpy>
            </Grid>
            <Grid item xs={6}>
              <FormSpy<SwapFormData> subscription={{ values: true }}>
                {({ values }) => (
                  <DecimalsField
                    baseDecimals={slippageDecimals}
                    baseUnitName="%"
                    name={fieldNames.additionalSlippageTo}
                    label={`${getProtocolLabel(values.protocolTo)} additional slippage`}
                    withSelect={false}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                )}
              </FormSpy>
            </Grid>
            {!dirtySinceLastSubmit && !!submitError && (
              <Grid item xs={12}>
                <Hint>
                  <Typography color="error">{submitError}</Typography>
                </Hint>
              </Grid>
            )}
            <Grid item xs={6}>
              <Button
                disabled={!dirty}
                variant="outlined"
                color="primary"
                fullWidth
                onClick={reset}
              >
                Reset
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button variant="contained" color="primary" type="submit" fullWidth>
                Apply
              </Button>
            </Grid>
          </Grid>
        </form>
      )}
    </Form>
  );
});

export interface SwapFormData {
  amountIn: string;
  tokenFrom: string;
  tokenTo: string;
  protocolFrom: Protocol;
  protocolTo: Protocol;
  additionalSlippageFrom: string;
  additionalSlippageTo: string;
  slippageDecimals: number;
}

const fieldNames: { [key in keyof SwapFormData]: key } = {
  amountIn: 'amountIn',
  tokenFrom: 'tokenFrom',
  tokenTo: 'tokenTo',
  protocolFrom: 'protocolFrom',
  protocolTo: 'protocolTo',
  additionalSlippageFrom: 'additionalSlippageFrom',
  additionalSlippageTo: 'additionalSlippageTo',
  slippageDecimals: 'slippageDecimals',
};

interface SwapOptionsFormProps {
  onSubmit(values: SwapFormData): void;
}

interface Option<T extends string = string> {
  value: T;
  label: string;
}

type ProtocolOption = Option<Protocol>;

const protocolsOptions: ProtocolOption[] = [
  {
    value: 'balancer',
    label: 'Balancer',
  },
  {
    value: 'uniswap-v2',
    label: 'Uniswap V2',
  },
];

function getProtocolLabel(protocol: Protocol): string {
  return (protocolsOptions.find(item => item.value === protocol) || { label: 'Unknown protocol' })
    .label;
}

function getOtherProtocol(protocol: Protocol): Protocol {
  const otherProtocol = protocolsOptions.find(item => item.value !== protocol);

  if (!otherProtocol) {
    throw new Error("Can't find other protocol");
  }
  return otherProtocol.value;
}

const tokensOptions: Option[] = Object.entries(ETH_NETWORK_CONFIG.contracts.swapTokens).map(
  ([label, value]) => ({
    label,
    value,
  }),
);

function validate(values: SwapFormData) {
  const errors: { [key in keyof SwapFormData]?: ITranslateKey } = {
    amountIn: isRequired(values.amountIn) || moreThen(0, values.amountIn),
    additionalSlippageFrom: isRequired(values.additionalSlippageFrom),
    additionalSlippageTo: isRequired(values.additionalSlippageTo),
  };

  return errors;
}

const decorators = [
  createCalculateDecorator(
    {
      field: fieldNames.protocolFrom,
      updates: {
        [fieldNames.protocolTo]: (value: Protocol) => getOtherProtocol(value),
      },
    },
    {
      field: fieldNames.protocolTo,
      updates: {
        [fieldNames.protocolFrom]: (value: Protocol) => getOtherProtocol(value),
      },
    },
  ),
];
