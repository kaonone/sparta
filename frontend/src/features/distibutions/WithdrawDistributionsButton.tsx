import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';
import BN from 'bn.js';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { ConfirmationDialog, Loading, FormattedBalance } from 'components';
import { useSubscribable } from 'utils/react';
import { zeroAddress } from 'utils/mock';
import { formatBalance } from 'utils/format';

type IProps = React.ComponentPropsWithoutRef<typeof Button>;

const tKeysConfirmation = tKeysAll.features.cashExchange.exchangingConfirmation;
const tKeys = tKeysAll.features.distributions;

export function WithdrawDistributionsButton(props: IProps) {
  const { t } = useTranslate();
  const api = useApi();

  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);
  const [daiTokenInfo, daiTokenInfoMeta] = useSubscribable(
    () => api.tokens.getTokenInfo$('dai'),
    [],
  );
  const [unclaimedDistributions, unclaimedDistributionsMeta] = useSubscribable(
    () => api.tokens.getUnclaimedDistributions$(account || zeroAddress),
    [account],
    new BN(0),
  );

  const [unclaimedDistributionsInDai, unclaimedDistributionsInDaiMeta] = useSubscribable(
    () =>
      api.fundsModule.getAvailableBalanceIncreasing$(
        account || zeroAddress,
        unclaimedDistributions.toString(),
        '0',
      ),
    [account, unclaimedDistributions.toString()],
  );

  const confirmMessage = t(tKeys.withdrawConfirmationMessage.getKey(), {
    distributions:
      (unclaimedDistributionsInDai &&
        daiTokenInfo &&
        formatBalance({
          amountInBaseUnits: unclaimedDistributionsInDai,
          baseDecimals: daiTokenInfo.decimals,
          tokenSymbol: daiTokenInfo.symbol,
        })) ||
      '⏳',
  });

  const handleActivate = useCallback(async (): Promise<void> => {
    account && (await api.tokens.withdrawUnclaimedDistributions(account));
    close();
  }, [account]);

  return (
    <>
      <Loading
        meta={[
          daiTokenInfoMeta,
          accountMeta,
          unclaimedDistributionsMeta,
          unclaimedDistributionsInDaiMeta,
        ]}
      >
        <Button
          {...props}
          onClick={open}
          disabled={!unclaimedDistributionsInDai || unclaimedDistributionsInDai.isZero()}
        >
          {t(tKeys.withdrawButton.getKey())}&nbsp;
          {unclaimedDistributionsInDai && !unclaimedDistributionsInDai.isZero() && (
            <FormattedBalance sum={unclaimedDistributionsInDai.toString()} token="dai" />
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
