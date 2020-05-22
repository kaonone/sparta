import * as React from 'react';
import { Form, FormProps } from 'react-final-form';

import { ITranslateKey } from 'services/i18n';
import { isRequired, moreThen } from 'utils/validators';
import { Grid, Loading, Hint, Typography, Button } from 'components';
import { DecimalsField, TextInputField } from 'components/form';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';

interface Props {
  additionalButton: React.ReactChild;
  overrideSubmitButton?: React.ReactChild;
  disableSubmit: boolean;
  onSubmit(values: RunnerFormData): void;
}

export interface RunnerFormData {
  minEarn: string;
  privateKey: string;
}

export function SwapRunnerForm({
  additionalButton,
  overrideSubmitButton,
  disableSubmit,
  onSubmit,
}: Props) {
  const api = useApi();
  const [sourceTokenInfo, sourceTokenInfoMeta] = useSubscribable(
    () => api.tokens.getTokenInfo$('dai'),
    [],
  );

  const onFormSubmit: FormProps<RunnerFormData>['onSubmit'] = React.useCallback(
    (values, formApi) => {
      onSubmit(values);
      // Cannot reset() in onSubmit()
      setTimeout(() => {
        formApi.reset();
        formApi.change(fieldNames.minEarn, values.minEarn);
      }, 0);
    },
    [onSubmit],
  );

  return (
    <Form<RunnerFormData>
      validate={validate}
      onSubmit={onFormSubmit}
      initialValues={initialValues}
      subscription={{
        submitError: true,
        dirtySinceLastSubmit: true,
      }}
    >
      {({ handleSubmit, submitError, dirtySinceLastSubmit }) => (
        <form onSubmit={handleSubmit}>
          <Grid container justify="center" spacing={2}>
            <Grid item xs={12}>
              <Loading meta={sourceTokenInfoMeta}>
                {sourceTokenInfo && (
                  <DecimalsField
                    baseDecimals={sourceTokenInfo.decimals}
                    baseUnitName={sourceTokenInfo.symbol}
                    name={fieldNames.minEarn}
                    label="min earn for auto swap"
                  />
                )}
              </Loading>
            </Grid>
            <Grid item xs={12}>
              <TextInputField
                fullWidth
                type="password"
                variant="outlined"
                label="Private key"
                name={fieldNames.privateKey}
              />
            </Grid>
            {!dirtySinceLastSubmit && !!submitError && (
              <Grid item xs={12}>
                <Hint>
                  <Typography color="error">{submitError}</Typography>
                </Hint>
              </Grid>
            )}
            <Grid item xs={6}>
              {additionalButton}
            </Grid>
            <Grid item xs={6}>
              {overrideSubmitButton || (
                <Button
                  disabled={disableSubmit}
                  variant="contained"
                  color="primary"
                  type="submit"
                  fullWidth
                >
                  Run
                </Button>
              )}
            </Grid>
          </Grid>
        </form>
      )}
    </Form>
  );
}

const fieldNames: { [key in keyof RunnerFormData]: key } = {
  minEarn: 'minEarn',
  privateKey: 'privateKey',
};

const initialValues: RunnerFormData = {
  minEarn: '',
  privateKey: '',
};

function validate(values: RunnerFormData) {
  const errors: { [key in keyof RunnerFormData]?: ITranslateKey } = {
    minEarn: isRequired(values.minEarn) || moreThen(0, values.minEarn),
    privateKey: isRequired(values.privateKey),
  };

  return errors;
}
