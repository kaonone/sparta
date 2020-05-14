import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';
import BN from 'bn.js';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { ConfirmationDialog, Loading, FormattedBalance } from 'components';
import { useSubscribable } from 'utils/react';
import { usePledgeSubscription } from 'generated/gql/pool';
import { getPledgeId } from 'model';
import { zeroAddress } from 'utils/mock';
import { formatBalance } from 'utils/format';

type IProps = React.ComponentPropsWithoutRef<typeof Button> & {
  proposalId: string;
  debtId: string;
  borrower: string;
};

const tKeysConfirmation = tKeysAll.features.cashExchange.exchangingConfirmation;
const tKeys = tKeysAll.features.cashExchange.unlockButton;

export function UnlockButton(props: IProps) {
  const { borrower, proposalId, debtId, ...restProps } = props;
  const { t } = useTranslate();
  const api = useApi();

  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const [daiTokenInfo, daiTokenInfoMeta] = useSubscribable(
    () => api.tokens.getTokenInfo$('dai'),
    [],
  );
  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);
  const pledgeGqlResult = usePledgeSubscription({
    variables: {
      pledgeHash: account && proposalId ? getPledgeId(account, borrower, proposalId) : '',
    },
  });

  const pInterest = pledgeGqlResult.data?.pledge?.pInterest || '0';

  const [pAvailableForUnlock, pAvailableForUnlockMeta] = useSubscribable(
    () => api.loanModule.calculatePAvailableForUnlock$(borrower, account || zeroAddress, debtId),
    [borrower, account, debtId],
    new BN(0),
  );

  const [interestCost, interestCostMeta] = useSubscribable(
    () => api.fundsModule.getAvailableBalanceIncreasing$(account || zeroAddress, pInterest, '0'),
    [account, pInterest],
  );

  // includes interestCost
  const [availableForUnlockCost, availableForUnlockCostMeta] = useSubscribable(
    () =>
      api.fundsModule.getAvailableBalanceIncreasing$(
        account || zeroAddress,
        pAvailableForUnlock.toString(),
        '0',
      ),
    [account, pAvailableForUnlock.toString()],
  );

  const confirmMessage = t(tKeys.confirmMessage.getKey(), {
    pledgeForUnlock:
      (availableForUnlockCost &&
        interestCost &&
        daiTokenInfo &&
        formatBalance({
          amountInBaseUnits: availableForUnlockCost.sub(interestCost),
          baseDecimals: daiTokenInfo.decimals,
          tokenSymbol: daiTokenInfo.symbol,
        })) ||
      '⏳',
    earnForUnlock:
      (interestCost &&
        daiTokenInfo &&
        formatBalance({
          amountInBaseUnits: interestCost,
          baseDecimals: daiTokenInfo.decimals,
          tokenSymbol: daiTokenInfo.symbol,
        })) ||
      '⏳',
  });

  const handleActivate = useCallback(async (): Promise<void> => {
    account && (await api.loanModule.unlockPtkFromPledge(account, { borrower, debtId }));
    close();
  }, [account, borrower, debtId]);

  return (
    <>
      <Loading
        meta={[
          daiTokenInfoMeta,
          accountMeta,
          pAvailableForUnlockMeta,
          interestCostMeta,
          availableForUnlockCostMeta,
        ]}
        gqlResults={pledgeGqlResult}
      >
        <Button {...restProps} onClick={open}>
          {t(tKeys.buttonTitle.getKey())}&nbsp;
          {availableForUnlockCost && (
            <FormattedBalance sum={availableForUnlockCost.toString()} token="dai" />
          )}
        </Button>
      </Loading>
      <ConfirmationDialog
        isOpen={isOpen}
        message={confirmMessage}
        noText={t(tKeysConfirmation.no.getKey())}
        yesText={t(tKeysConfirmation.yes.getKey())}
        title={t(tKeysConfirmation.title.getKey())}
        onCancel={close}
        onConfirm={handleActivate}
      />
    </>
  );
}
