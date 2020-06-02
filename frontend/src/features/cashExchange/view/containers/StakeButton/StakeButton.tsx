import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';
import { map } from 'rxjs/operators';
import BN from 'bn.js';
import { combineLatest, of } from 'rxjs';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { ModalButton } from 'components/ModalButton/ModalButton';
import { min, roundWei } from 'utils/bn';
import { useSubscribable } from 'utils/react';
import { Loading } from 'components';
import { formatBalance } from 'utils/format';
import { calcInterestShare } from 'model';

import {
  PTokenExchanging,
  ISubmittedFormData,
} from '../../components/PTokenExcahnging/PTokenExcahnging';

type IProps = React.ComponentPropsWithoutRef<typeof Button> & {
  loanSize: string;
  proposalId: string;
  borrower: string;
};

const tKeys = tKeysAll.features.cashExchange.stakeButton;

function StakeButton(props: IProps) {
  const { borrower, proposalId, loanSize, ...restProps } = props;
  const { t } = useTranslate();
  const api = useApi();

  const [daiTokenInfo, daiTokenInfoMeta] = useSubscribable(
    () => api.tokens.getTokenInfo$('dai'),
    [],
  );
  const decimals = daiTokenInfo?.decimals || 0;

  const [fullLoanStake, fullLoanStakeMeta] = useSubscribable(
    () => api.loanModule.calculateFullLoanStake$(loanSize),
    [loanSize],
    new BN(0),
  );

  const getConfirmMessage = useCallback(
    (values: ISubmittedFormData | null) => {
      const rawSourceAmount = new BN(values?.sourceAmount?.toString() || '0');

      const interestShareDecimals = 2;
      const rawInterestShareDelta = calcInterestShare(
        rawSourceAmount,
        fullLoanStake,
        interestShareDecimals,
      );

      const interestShareDelta =
        (daiTokenInfo &&
          `${formatBalance({
            amountInBaseUnits: rawInterestShareDelta,
            baseDecimals: interestShareDecimals,
          })}%`) ||
        '⏳';

      const sourceAmount =
        (daiTokenInfo &&
          formatBalance({
            amountInBaseUnits: rawSourceAmount,
            baseDecimals: daiTokenInfo.decimals,
            tokenSymbol: daiTokenInfo.symbol,
          })) ||
        '⏳';

      return of(t(tKeys.confirmMessage.getKey(), { interestShareDelta, sourceAmount }));
    },
    [t, daiTokenInfo, fullLoanStake],
  );

  const getMaxSourceValue = useCallback(
    (account: string) =>
      combineLatest([
        api.fundsModule.getPtkBalanceInDaiWithoutFee$(account),
        api.loanModule.getPledgeRequirements$(borrower, proposalId),
      ]).pipe(
        map(([balance, { maxLPledge }]) => {
          const roundedBalance = roundWei(balance, decimals, 'floor', 2);
          const roundedMaxStakeSize = roundWei(maxLPledge, decimals, 'ceil', 2);

          return min(roundedBalance, roundedMaxStakeSize);
        }),
      ),
    [borrower, proposalId, decimals],
  );
  const getMinSourceValue = useCallback(
    () =>
      api.loanModule
        .getPledgeRequirements$(borrower, proposalId)
        .pipe(map(({ minLPledge }) => minLPledge)),
    [borrower, proposalId],
  );

  const onStakeRequest = useCallback(
    (address: string, values: { sourceAmount: BN }): Promise<void> => {
      return api.loanModule.stakePtk(address, {
        borrower,
        proposalId,
        ...values,
      });
    },
    [borrower, proposalId],
  );

  return (
    <Loading meta={[daiTokenInfoMeta, fullLoanStakeMeta]} progressVariant="linear">
      <ModalButton content={t(tKeys.buttonTitle.getKey())} fullWidth {...restProps}>
        {({ closeModal }) => (
          <PTokenExchanging
            title={t(tKeys.formTitle.getKey())}
            sourcePlaceholder={t(tKeys.placeholder.getKey())}
            getMaxSourceValue={getMaxSourceValue}
            getMinSourceValue={getMinSourceValue}
            confirmMessageTKey={getConfirmMessage}
            onExchangeRequest={onStakeRequest}
            onCancel={closeModal}
          />
        )}
      </ModalButton>
    </Loading>
  );
}

export { StakeButton };
