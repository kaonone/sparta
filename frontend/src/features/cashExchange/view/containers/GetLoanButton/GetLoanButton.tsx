import React, { useMemo, useCallback } from 'react';
import Button from '@material-ui/core/Button';
import * as R from 'ramda';
import BN from 'bn.js';
import { map } from 'rxjs/operators';

import { useApi } from 'services/api';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useSubscribable } from 'utils/react';
import { ModalButton } from 'components/ModalButton/ModalButton';
import { Loading } from 'components/Loading';
import { DecimalsField, TextInputField, SpyField } from 'components/form';
import {
  isRequired,
  validateInteger,
  composeValidators,
  moreThen,
  onEnglishPlease,
  moreThenOrEqual,
  Validator,
} from 'utils/validators';
import { formatBalance } from 'utils/format';
import { roundWei } from 'utils/bn';

import {
  PTokenExchanging,
  ISubmittedFormData,
} from '../../components/PTokenExcahnging/PTokenExcahnging';

type IProps = React.ComponentPropsWithoutRef<typeof Button>;

const tKeys = tKeysAll.features.cashExchange.getLoanButton;

interface IExtraFormData {
  apr: string;
  description: string;
  triggerRevalidateApr: Validator;
}

const fieldNames: { [K in keyof IExtraFormData]: K } = {
  apr: 'apr',
  description: 'description',
  triggerRevalidateApr: 'triggerRevalidateApr',
};

const zero = new BN(0);

function GetLoanButton(props: IProps) {
  const { t } = useTranslate();
  const api = useApi();

  const [daiTokenInfo] = useSubscribable(() => api.tokens.getTokenInfo$('dai'), []);
  const decimals = daiTokenInfo?.decimals || 0;

  const getMaxSourceValue = useCallback(
    (account: string) =>
      api.loanModule
        .getMaxAvailableLoanSizeInDai$(account)
        .pipe(map(loanSize => roundWei(loanSize, decimals, 'floor', 2))),
    [decimals],
  );
  const getMinSourceValue = useCallback(
    () => api.loanModule.getConfig$().pipe(map(({ limits: { lDebtAmountMin } }) => lDebtAmountMin)),
    [decimals],
  );

  const [percentDecimals, percentDecimalsMeta] = useSubscribable(
    () => api.loanModule.getAprDecimals$(),
    [],
  );

  const [config] = useSubscribable(() => api.loanModule.getConfig$(), []);
  const minApr = config?.limits.debtInterestMin || zero;
  const formattedMinPercent = formatBalance({
    amountInBaseUnits: minApr,
    baseDecimals: percentDecimals || 0,
    precision: 2,
  });

  const validateApr = useMemo(() => {
    return composeValidators(
      isRequired,
      validateInteger,
      /* eslint-disable no-underscore-dangle */
      R.curry(moreThen)(new BN(0), R.__, undefined as any),
      ...(!minApr.isZero()
        ? [R.curry(moreThenOrEqual)(minApr, R.__, () => `${formattedMinPercent}%`)]
        : []),
      /* eslint-enable no-underscore-dangle */
    );
  }, [minApr, formattedMinPercent]);

  const validateDescription = useMemo(() => {
    return composeValidators(isRequired, onEnglishPlease);
  }, []);

  const initialValues = useMemo<IExtraFormData>(
    () => ({
      apr: '',
      description: '',
      triggerRevalidateApr: validateApr,
    }),
    [],
  );

  const getConfirmMessage = useCallback(
    (values: (ISubmittedFormData & IExtraFormData) | null) => {
      const rawSourceAmount = values?.sourceAmount?.toString() || '0';

      return api.loanModule.getMinLoanCollateralByDaiInDai$(rawSourceAmount).pipe(
        map(rawCollateral => {
          const collateral =
            (daiTokenInfo &&
              formatBalance({
                amountInBaseUnits: rawCollateral,
                baseDecimals: daiTokenInfo.decimals,
                tokenSymbol: daiTokenInfo.symbol,
              })) ||
            '⏳';

          const sourceAmount =
            (daiTokenInfo &&
              formatBalance({
                amountInBaseUnits: rawSourceAmount,
                baseDecimals: daiTokenInfo.decimals,
                tokenSymbol: daiTokenInfo.symbol,
              })) ||
            '⏳';

          return t(tKeys.confirmMessage.getKey(), { collateral, sourceAmount });
        }),
      );
    },
    [daiTokenInfo],
  );

  const additionalFields = useMemo(
    () => [
      <Loading meta={percentDecimalsMeta}>
        {percentDecimals && (
          <>
            <DecimalsField
              validate={validateApr}
              baseDecimals={percentDecimals}
              baseUnitName="%"
              name={fieldNames.apr}
              label={t(tKeys.percentLabel.getKey())}
              placeholder={t(tKeys.percentPlaceholder.getKey())}
              withSelect={false}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <SpyField name={fieldNames.triggerRevalidateApr} fieldValue={validateApr} />
          </>
        )}
      </Loading>,
      <Loading meta={percentDecimalsMeta}>
        {percentDecimals && (
          <TextInputField
            validate={validateDescription}
            name={fieldNames.description}
            label={t(tKeys.descriptionLabel.getKey())}
            placeholder={t(tKeys.descriptionPlaceholder.getKey())}
            variant="outlined"
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />
        )}
      </Loading>,
    ],
    [t, percentDecimals, validateApr],
  );

  return (
    <ModalButton
      content={t(tKeys.buttonTitle.getKey())}
      variant="contained"
      color="primary"
      fullWidth
      {...props}
    >
      {({ closeModal }) => (
        <PTokenExchanging<IExtraFormData>
          title={t(tKeys.formTitle.getKey())}
          sourcePlaceholder={t(tKeys.amountPlaceholder.getKey())}
          getMaxSourceValue={getMaxSourceValue}
          getMinSourceValue={getMinSourceValue}
          onExchangeRequest={api.loanModule.createLoanProposal}
          onCancel={closeModal}
          confirmMessageTKey={getConfirmMessage}
          additionalFields={additionalFields}
          initialValues={initialValues}
        />
      )}
    </ModalButton>
  );
}

export { GetLoanButton };
