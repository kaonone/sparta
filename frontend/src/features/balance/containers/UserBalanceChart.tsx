import * as React from 'react';
import moment from 'moment';
import BN from 'bn.js';

import { BalanceChart, Loading, FormattedBalance, Growth, IPeriodInfo } from 'components';
import { useMyUserBalancesSubscription, useMyUserSubscription } from 'generated/gql/pool';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { makeStyles } from 'utils/styles';
import { useSubscribable } from 'utils/react';
import { decimalsToWei } from 'utils/bn';
import { zeroAddress } from 'utils/mock';

export const useStyles = makeStyles({
  growth: {
    fontSize: '0.8em',
  },
});

const tKeys = tKeysAll.app.pages.overview;

interface IUserBalancePoint {
  date: number;
  value: number;
}

function UserBalanceChart() {
  const classes = useStyles();
  const api = useApi();
  const { t } = useTranslate();
  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);

  const myUserResult = useMyUserSubscription({
    variables: {
      address: account?.toLowerCase() || '',
    },
  });
  const pLockedSum = myUserResult.data?.user?.pLockedSum || '0';
  const unlockLiquiditySum = myUserResult.data?.user?.unlockLiquiditySum || '0';

  const [currentBalance, currentBalanceMeta] = useSubscribable(
    () =>
      api.fundsModule.getAvailableBalance$(account || zeroAddress, pLockedSum, unlockLiquiditySum),
    [account, pLockedSum, unlockLiquiditySum],
  );
  const [daiTokenInfo, daiTokenInfoMeta] = useSubscribable(
    () => api.tokens.getTokenInfo$('dai'),
    [],
  );
  const decimals = daiTokenInfo?.decimals;

  const yearAgoDate = React.useMemo(
    () =>
      moment()
        .subtract(1, 'years')
        .unix(),
    [],
  ); // Date in seconds

  const balancesResult = useMyUserBalancesSubscription({
    variables: {
      first: 1000,
      address: account || '',
      fromDate: new BN(yearAgoDate).toString(), // Date in seconds
    },
  });
  const balances = balancesResult.data?.exitBalances || [];

  const mockedPoints = React.useMemo<IUserBalancePoint[]>(
    () => [
      {
        date:
          Date.now() -
          moment()
            .subtract(1, 'days')
            .unix() *
            1000, // Date in milliseconds
        value: 0,
      },
      { date: Date.now(), value: 0 }, // Date in milliseconds
    ],
    [],
  );

  const chartPoints: IUserBalancePoint[] = React.useMemo(
    () =>
      balances.length && decimals
        ? balances
            .map(balance => ({
              date: parseInt(balance.date, 10) * 1000, // Date in milliseconds
              value:
                new BN(balance.lBalance)
                  .muln(100)
                  .div(decimalsToWei(decimals))
                  .toNumber() / 100,
            }))
            .concat({
              value:
                (currentBalance
                  ?.muln(100)
                  .div(decimalsToWei(decimals))
                  .toNumber() || 0) / 100,
              date: Date.now(),
            })
        : mockedPoints,
    [balances, decimals, currentBalance?.toString()],
  );

  const renderCurrentBalance = React.useCallback(
    (periodInfo: IPeriodInfo<IUserBalancePoint>) => (
      <>
        {currentBalance && <FormattedBalance sum={currentBalance} token="dai" />}{' '}
        <Growth
          className={classes.growth}
          previous={new BN(periodInfo.firstPoint.value * 100)}
          current={new BN(periodInfo.lastPoint.value * 100)}
        />
      </>
    ),
    [currentBalance?.toString()],
  );

  return (
    <Loading
      gqlResults={[balancesResult, myUserResult]}
      meta={[accountMeta, daiTokenInfoMeta, currentBalanceMeta]}
    >
      <BalanceChart
        renderCurrentBalance={renderCurrentBalance}
        chartPoints={chartPoints}
        chartLines={['value']}
        title={t(tKeys.myBalanceTitle.getKey())}
      />
    </Loading>
  );
}

export { UserBalanceChart };
