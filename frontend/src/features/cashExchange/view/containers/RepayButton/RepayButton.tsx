import React, { useCallback, useMemo } from 'react';
import Button from '@material-ui/core/Button';
import { map } from 'rxjs/operators';
import BN from 'bn.js';
import { of } from 'rxjs';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { ModalButton, FormControlLabel, Radio, Loading } from 'components';
import { RadioGroupInputField, SpyField } from 'components/form';
import { useSubscribable, useFormattedBalance } from 'utils/react';
import { formatBalance } from 'utils/format';
import { max, min } from 'utils/bn';
import { RepaymentMethod, repaymentMethods } from 'model/types';
import { lessThenOrEqual } from 'utils/validators';
import { zeroAddress } from 'utils/mock';

import {
  PTokenExchanging,
  ISubmittedFormData,
} from '../../components/PTokenExcahnging/PTokenExcahnging';

type IProps = React.ComponentPropsWithoutRef<typeof Button> & {
  debtId: string;
  lastPaymentDate: string;
  account: string;
};

const tKeys = tKeysAll.features.cashExchange.repayButton;

interface IExtraFormData {
  repaymentMethod: RepaymentMethod;
  triggerRevalidateForm: () => void;
}

const fieldNames: { [K in keyof IExtraFormData]: K } = {
  repaymentMethod: 'repaymentMethod',
  triggerRevalidateForm: 'triggerRevalidateForm',
};

function RepayButton(props: IProps) {
  const { debtId, account, lastPaymentDate, ...restProps } = props;
  const { t } = useTranslate();
  const api = useApi();

  const [daiTokenInfo] = useSubscribable(() => api.tokens.getTokenInfo$('dai'), []);

  const getConfirmMessage = useCallback(
    (values: ISubmittedFormData | null) => {
      const rawSourceAmount = new BN(values?.sourceAmount?.toString() || '0');

      return api.loanModule.getDebtRequiredPayments$(account, debtId, lastPaymentDate).pipe(
        map(({ currentInterest }) => {
          const rawBody = max('0', rawSourceAmount.sub(currentInterest));
          const rawInterest = min(rawSourceAmount, currentInterest);

          const body =
            (daiTokenInfo &&
              formatBalance({
                amountInBaseUnits: rawBody,
                baseDecimals: daiTokenInfo.decimals,
                tokenSymbol: daiTokenInfo.symbol,
                precision: 4,
              })) ||
            '⏳';

          const interest =
            (daiTokenInfo &&
              formatBalance({
                amountInBaseUnits: rawInterest,
                baseDecimals: daiTokenInfo.decimals,
                tokenSymbol: daiTokenInfo.symbol,
                precision: 4,
              })) ||
            '⏳';

          const sourceAmount =
            (daiTokenInfo &&
              formatBalance({
                amountInBaseUnits: rawSourceAmount,
                baseDecimals: daiTokenInfo.decimals,
                tokenSymbol: daiTokenInfo.symbol,
                precision: 4,
              })) ||
            '⏳';

          return t(tKeys.confirmMessage.getKey(), { body, interest, sourceAmount });
        }),
      );
    },
    [daiTokenInfo, account, debtId, lastPaymentDate],
  );

  const initialValues = useMemo<IExtraFormData>(
    () => ({
      repaymentMethod: 'fromOwnBalance',
      triggerRevalidateForm: () => undefined,
    }),
    [],
  );

  const getMaxSourceValue = useCallback(
    () =>
      api.loanModule
        .getDebtRequiredPayments$(account, debtId, lastPaymentDate)
        .pipe(map(({ currentInterest, loanSize }) => currentInterest.add(loanSize))),
    [debtId, account, lastPaymentDate],
  );
  const getMinSourceValue = useCallback(() => of(new BN(0)), []);

  const [availablePoolBalance, availablePoolBalanceMeta] = useSubscribable(
    () => api.fundsModule.getPtkBalanceInDaiWithFee$(account || zeroAddress),
    [account],
    new BN(0),
  );
  const [availableDaiBalance, availableDaiBalanceMeta] = useSubscribable(
    () => api.tokens.getBalance$('dai', account || zeroAddress),
    [account],
    new BN(0),
  );

  const [{ formattedBalance: formattedAvailablePoolBalance }] = useFormattedBalance({
    token: 'dai',
    value: availablePoolBalance,
    precision: daiTokenInfo?.decimals,
    variant: 'short',
  });
  const [{ formattedBalance: formattedAvailableDaiBalance }] = useFormattedBalance({
    token: 'dai',
    value: availableDaiBalance,
    precision: daiTokenInfo?.decimals,
    variant: 'short',
  });

  const validateForm = useCallback(
    ({ repaymentMethod, sourceAmount }: IExtraFormData & { sourceAmount: string }) => {
      const sourceAmountError =
        repaymentMethod === 'fromAvailablePoolBalance'
          ? lessThenOrEqual(
              availablePoolBalance,
              sourceAmount,
              () => formattedAvailablePoolBalance,
              tKeys.insufficientBalanceError.getKey(),
            )
          : lessThenOrEqual(
              availableDaiBalance,
              sourceAmount,
              () => formattedAvailableDaiBalance,
              tKeys.insufficientBalanceError.getKey(),
            );

      return { sourceAmount: sourceAmountError };
    },
    [
      availablePoolBalance.toString(),
      availableDaiBalance.toString(),
      formattedAvailablePoolBalance,
    ],
  );

  const onRepayRequest = useCallback(
    (address: string, values: { sourceAmount: BN } & IExtraFormData): Promise<void> => {
      return api.loanModule.repay(address, debtId, values.sourceAmount, values.repaymentMethod);
    },
    [debtId],
  );

  const additionalFields = useMemo(
    () => [
      <RadioGroupInputField name={fieldNames.repaymentMethod}>
        {repaymentMethods.map(value => (
          <FormControlLabel
            key={value}
            value={value}
            control={<Radio color="primary" />}
            label={t(tKeys.fields.repaymentMethod[value].getKey())}
          />
        ))}
      </RadioGroupInputField>,
      <SpyField name={fieldNames.triggerRevalidateForm} fieldValue={validateForm} />,
    ],
    [validateForm],
  );

  return (
    <Loading meta={[availablePoolBalanceMeta, availableDaiBalanceMeta]}>
      <ModalButton content={t(tKeys.buttonTitle.getKey())} fullWidth {...restProps}>
        {({ closeModal }) => (
          <PTokenExchanging<IExtraFormData>
            title={t(tKeys.formTitle.getKey())}
            sourcePlaceholder={t(tKeys.placeholder.getKey())}
            getMaxSourceValue={getMaxSourceValue}
            getMinSourceValue={getMinSourceValue}
            confirmMessageTKey={getConfirmMessage}
            onExchangeRequest={onRepayRequest}
            onCancel={closeModal}
            additionalFields={additionalFields}
            initialValues={initialValues}
            validateForm={validateForm}
          />
        )}
      </ModalButton>
    </Loading>
  );
}

export { RepayButton };
