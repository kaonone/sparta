import * as React from 'react';
import BN from 'bn.js';
import moment from 'moment';
import * as R from 'ramda';

import { BalanceChart, Loading, FormattedBalance } from 'components';
import { usePoolBalancesSubscription } from 'generated/gql/pool';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { makeStyles } from 'utils/styles';
import { useSubscribable } from 'utils/react';
import { decimalsToWei } from 'utils/bn';

const enterPriceColor = '#2ED573';
const exitPriceColor = '#613AAF';

export const useStyles = makeStyles({
  enterPrice: {
    color: enterPriceColor,
  },
  exitPrice: {
    color: exitPriceColor,
  },
});

const tKeys = tKeysAll.app.pages.overview;

interface PoolPoint {
  date: number;
  lEnterPrice: number;
  lExitPrice: number;
}

function PoolBalanceChart() {
  const classes = useStyles();
  const api = useApi();
  const { t } = useTranslate();

  const [daiTokenInfo, daiTokenInfoMeta] = useSubscribable(
    () => api.tokens.getTokenInfo$('dai'),
    [],
  );
  const decimals = daiTokenInfo?.decimals || 0;

  const yearAgoDate = React.useMemo(
    () =>
      moment()
        .subtract(1, 'years')
        .unix(),
    [],
  ); // Date in seconds

  const balancesResult = usePoolBalancesSubscription({
    variables: {
      date: `0x${yearAgoDate.toString(16)}`, // Date in seconds
    },
  });
  const pools = balancesResult.data?.pools || [];

  const mockedPoints = React.useMemo<PoolPoint[]>(
    () => [
      {
        date:
          Date.now() -
          moment()
            .subtract(1, 'days')
            .unix() *
            1000, // Date in milliseconds
        lEnterPrice: 0,
        lExitPrice: 0,
      },
      { date: Date.now(), lEnterPrice: 0, lExitPrice: 0 }, // Date in milliseconds
    ],
    [],
  );

  const chartPoints: PoolPoint[] = React.useMemo(
    () =>
      pools.length && decimals
        ? pools.map<PoolPoint>(pool => ({
            date: parseInt(pool.id, 16) * 1000, // Date in milliseconds
            lEnterPrice: convertPtkPriceToDaiPrice(pool.pEnterPrice, decimals, 'number'),
            lExitPrice: convertPtkPriceToDaiPrice(pool.pExitPrice, decimals, 'number'),
          }))
        : mockedPoints,
    [pools, decimals],
  );

  const lastPool = R.last(pools);
  const currentLEnterPrice =
    (lastPool && convertPtkPriceToDaiPrice(lastPool.pEnterPrice, decimals, 'weiBN')) || '0';
  const currentLExitPrice =
    (lastPool && convertPtkPriceToDaiPrice(lastPool.pExitPrice, decimals, 'weiBN')) || '0';

  const renderCurrentBalance = React.useCallback(
    () => (
      <>
        <FormattedBalance className={classes.enterPrice} sum={currentLEnterPrice} token="dai" /> /{' '}
        <FormattedBalance className={classes.exitPrice} sum={currentLExitPrice} token="dai" />
      </>
    ),
    [currentLEnterPrice, currentLExitPrice],
  );

  return (
    <Loading gqlResults={balancesResult} meta={daiTokenInfoMeta}>
      <BalanceChart
        chartPoints={chartPoints}
        chartLines={['lExitPrice', 'lEnterPrice']}
        chartLineColors={{ lEnterPrice: enterPriceColor, lExitPrice: exitPriceColor }}
        title={t(tKeys.poolBalanceTitle.getKey())}
        renderCurrentBalance={renderCurrentBalance}
      />
    </Loading>
  );
}

function convertPtkPriceToDaiPrice(price: string | BN, decimals: number, output: 'number'): number;
function convertPtkPriceToDaiPrice(price: string | BN, decimals: number, output: 'weiBN'): BN;
function convertPtkPriceToDaiPrice(
  price: string | BN,
  decimals: number,
  output: 'number' | 'weiBN',
): number | BN {
  const byOutput = {
    number: () =>
      decimalsToWei(decimals)
        .muln(100)
        .div(new BN(price))
        .toNumber() / 100,
    weiBN: () =>
      decimalsToWei(decimals)
        .mul(decimalsToWei(decimals))
        .div(new BN(price)),
  };

  return byOutput[output]();
}

export { PoolBalanceChart };
