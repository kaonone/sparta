import React, { useMemo, useCallback } from 'react';
import BN from 'bn.js';
import { Form, FormSpy } from 'react-final-form';
import { FORM_ERROR } from 'final-form';
import * as R from 'ramda';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import { Observable } from 'rxjs';
import createDecorator, { Calculation } from 'final-form-calculate';

import { useTranslate, tKeys as tKeysAll, ITranslateKey } from 'services/i18n';
import { useApi } from 'services/api';
import { DecimalsField, SpyField } from 'components/form';
import { Hint } from 'components/Hint/Hint';
import { Loading } from 'components/Loading';
import {
  validateInteger,
  validatePositiveNumber,
  lessThenOrEqual,
  composeValidators,
  isRequired,
  moreThen,
  moreThenOrEqual,
} from 'utils/validators';
import { useSubscribable, useFormattedBalance } from 'utils/react';

export interface IFormData {
  sourceAmount: string;
  triggerRevalidateSourceAmount: (...args: any[]) => any;
}

export const fieldNames: { [K in keyof IFormData]: K } = {
  sourceAmount: 'sourceAmount',
  triggerRevalidateSourceAmount: 'triggerRevalidateSourceAmount',
};

export interface ISubmittedFormData {
  sourceAmount: BN;
}

export interface IProps<ExtraFormData extends Record<string, any> = {}> {
  account: string;
  title: string;
  isReadOnlySource?(values: ExtraFormData & IFormData): boolean;
  sourcePlaceholder: string;
  additionalFields?: React.ReactNode[];
  additionalInitialValues?: ExtraFormData;
  getMaxSourceValue: (account: string) => Observable<BN>;
  getMinSourceValue: (account: string) => Observable<BN>;
  onSubmit: (values: ISubmittedFormData & ExtraFormData) => void;
  onCancel: () => void;
  validateForm?(
    values: ExtraFormData & IFormData,
  ): { [key in keyof (ExtraFormData & IFormData)]?: ITranslateKey | null };
  formCalculations?: Calculation[];
}

function PTokenExchangingForm<ExtraFormData extends Record<string, any> = {}>(
  props: IProps<ExtraFormData>,
) {
  const {
    account,
    title,
    onSubmit,
    onCancel,
    isReadOnlySource,
    sourcePlaceholder,
    getMaxSourceValue,
    getMinSourceValue,
    additionalFields,
    additionalInitialValues = {} as ExtraFormData,
    validateForm,
    formCalculations,
  } = props;

  const { t } = useTranslate();
  const tKeys = tKeysAll.features.cashExchange.exchangingForm;

  const api = useApi();

  const decorators = useMemo(() => {
    return formCalculations ? [createDecorator(...formCalculations)] : undefined;
  }, [formCalculations]);

  const [maxValue] = useSubscribable(() => getMaxSourceValue(account), [
    getMaxSourceValue,
    account,
  ]);
  const [minValue] = useSubscribable(() => getMinSourceValue(account), [
    getMinSourceValue,
    account,
  ]);

  const [sourceTokenInfo, sourceTokenInfoMeta] = useSubscribable(
    () => api.tokens.getTokenInfo$('dai'),
    [],
  );

  const [{ formattedBalance: formattedMax }] = useFormattedBalance(
    'dai',
    maxValue || new BN(0),
    sourceTokenInfo?.decimals,
    'short',
  );
  const formatMax = useCallback(() => formattedMax, [formattedMax]);
  const [{ formattedBalance: formattedMin }] = useFormattedBalance(
    'dai',
    minValue || new BN(0),
    sourceTokenInfo?.decimals,
    'short',
  );
  const formatMin = useCallback(() => formattedMin, [formattedMin]);

  const validateAmount = useMemo(() => {
    const validate = composeValidators(
      isRequired,
      validateInteger,
      validatePositiveNumber,
      /* eslint-disable no-underscore-dangle */
      R.curry(moreThen)(new BN(0), R.__, undefined as any),
      ...(maxValue ? [(value: string) => lessThenOrEqual(maxValue, value, formatMax)] : []),
      ...(minValue ? [R.curry(moreThenOrEqual)(minValue, R.__, formatMin)] : []),
      /* eslint-enable no-underscore-dangle */
    );

    return (value: string, allValues: Object) => {
      return isReadOnlySource && isReadOnlySource(allValues as ExtraFormData & IFormData)
        ? undefined
        : validate(value);
    };
  }, [maxValue, formatMax, minValue, formatMin, isReadOnlySource]);

  const initialValues = useMemo<IFormData & ExtraFormData>(
    () => ({
      sourceAmount: '',
      triggerRevalidateSourceAmount: validateAmount,
      ...additionalInitialValues,
    }),
    [],
  );

  const handleFormSubmit = useCallback(
    ({
      sourceAmount,
      triggerRevalidateSourceAmount,
      ...restValues
    }: IFormData & ExtraFormData): { [FORM_ERROR]: string } | void => {
      onSubmit({
        sourceAmount: new BN(sourceAmount),
        ...((restValues as unknown) as ExtraFormData),
      });
    },
    [onSubmit],
  );

  return (
    <Loading meta={sourceTokenInfoMeta}>
      <Form
        decorators={decorators}
        validate={validateForm}
        onSubmit={handleFormSubmit}
        initialValues={initialValues}
        subscription={{ submitError: true, submitting: true, dirtySinceLastSubmit: true }}
      >
        {({ handleSubmit, submitError, submitting, dirtySinceLastSubmit }) => (
          <form onSubmit={handleSubmit}>
            <Grid container justify="center" spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                  {title}
                </Typography>

                {sourceTokenInfo && (
                  <FormSpy subscription={{ values: true }}>
                    {({ values }: { values: ExtraFormData & IFormData }) => (
                      <DecimalsField
                        disabled={isReadOnlySource && isReadOnlySource(values)}
                        maxValue={maxValue}
                        validate={validateAmount}
                        baseDecimals={sourceTokenInfo.decimals}
                        baseUnitName={sourceTokenInfo.symbol}
                        name={fieldNames.sourceAmount}
                        placeholder={sourcePlaceholder}
                      />
                    )}
                  </FormSpy>
                )}
                <SpyField
                  name={fieldNames.triggerRevalidateSourceAmount}
                  fieldValue={validateAmount}
                />
              </Grid>
              {additionalFields?.map((item, index) => (
                <Grid key={index} item xs={12}>
                  {item}
                </Grid>
              ))}
              {!dirtySinceLastSubmit && !!submitError && (
                <Grid item xs={12}>
                  <Hint>
                    <Typography color="error">{submitError}</Typography>
                  </Hint>
                </Grid>
              )}
              <Grid item xs={6}>
                <Button variant="outlined" color="primary" fullWidth onClick={onCancel}>
                  {t(tKeys.cancelButtonText.getKey())}
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  fullWidth
                  disabled={submitting}
                >
                  {submitting ? <CircularProgress size={24} /> : 'submit'}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Form>
    </Loading>
  );
}

export { PTokenExchangingForm };
