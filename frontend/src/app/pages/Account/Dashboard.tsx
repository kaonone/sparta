import React from 'react';
import BN from 'bn.js';
import { of } from 'rxjs';

import { Grid, Loading, FormattedBalance } from 'components';
import {
  PTokenBuyingButton,
  PTokenSellingButton,
  WithdrawDefiYieldButton,
  PreliminaryExitButton,
} from 'features/cashExchange';
import { WithdrawDistributionsButton } from 'features/distibutions';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { zeroAddress } from 'utils/mock';
import { useAvgPoolAPR } from 'model/hooks';

import { AccountMetricCard } from './AccountMetricCard';

export function Dashboard() {
  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, []);

  const [isWithdrawPeriod, isWithdrawPeriodMeta] = useSubscribable(
    () => api.liquidityModule.isWithdrawPeriod$(account || zeroAddress),
    [api, account],
  );

  return (
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <Balance />
      </Grid>
      <Grid item xs={4}>
        <Loading meta={isWithdrawPeriodMeta}>{isWithdrawPeriod ? <Withdraw /> : <Exit />}</Loading>
      </Grid>
      <Grid item xs={4}>
        <Distribution />
      </Grid>
    </Grid>
  );
}

export function DefiYield() {
  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, []);

  const [defiYield, defiYieldMeta] = useSubscribable(
    () => api.defiModule.getAvailableInterest$(account || zeroAddress),
    [api, account],
  );

  const avgPoolGqlResult = useAvgPoolAPR();

  return (
    <AccountMetricCard
      title="Yield"
      primaryMetric={
        <Loading meta={defiYieldMeta}>
          {defiYield && <FormattedBalance sum={defiYield.toString()} token="dai" />}
        </Loading>
      }
      secondaryMetric={
        <Loading gqlResults={avgPoolGqlResult}>
          ~{avgPoolGqlResult.data?.formattedApr || 'unknown'}% APR
        </Loading>
      }
      actionButtons={[<WithdrawDefiYieldButton fullWidth color="primary" variant="contained" />]}
    />
  );
}

export function Exit() {
  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, []);

  const [exitInfo, exitInfoMeta] = useSubscribable(
    () => api.liquidityModule.getPreliminaryExitInfo$(account || zeroAddress),
    [api, account],
  );

  return (
    <AccountMetricCard
      title="Preliminary exit"
      primaryMetric={
        <Loading meta={exitInfoMeta}>
          {exitInfo && <FormattedBalance sum={exitInfo.exitBalance} token="dai" />}
        </Loading>
      }
      secondaryMetric={
        <Loading meta={exitInfoMeta}>
          {exitInfo && (
            <span>
              You lose <FormattedBalance sum={exitInfo.exitLose} token="dai" />
            </span>
          )}
        </Loading>
      }
      actionButtons={[<PreliminaryExitButton fullWidth color="primary" variant="contained" />]}
    />
  );
}

function Balance() {
  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, []);
  const [ptkBalance, ptkBalanceMeta] = useSubscribable(
    () => (account ? api.tokens.getBalance$('ptk', account) : of(new BN(0))),
    [api, account],
    new BN(0),
  );
  const [daiBalance, daiBalanceMeta] = useSubscribable(
    () => api.fundsModule.getPtkToDaiExitInfo$(ptkBalance.toString()),
    [api, ptkBalance.toString()],
  );

  return (
    <AccountMetricCard
      title="Share"
      primaryMetric={
        <Loading meta={daiBalanceMeta}>
          {daiBalance && <FormattedBalance sum={daiBalance.user.toString()} token="dai" />}
        </Loading>
      }
      secondaryMetric={
        <Loading meta={ptkBalanceMeta}>
          <FormattedBalance sum={ptkBalance.toString()} token="ptk" />
        </Loading>
      }
      actionButtons={[<PTokenBuyingButton fullWidth color="primary" variant="contained" />]}
    />
  );
}

function Withdraw() {
  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, []);
  const [available, availableMeta] = useSubscribable(
    () => api.liquidityModule.getWithdrawLimitInDai$(account || zeroAddress),
    [api, account],
  );

  const [withdrawPeriodDate, withdrawPeriodDateMeta] = useSubscribable(
    () => api.liquidityModule.getWithdrawPeriodDate$(account || zeroAddress),
    [api, account],
  );

  return (
    <AccountMetricCard
      title="Available for withdraw"
      primaryMetric={
        <Loading meta={availableMeta}>
          {available && <FormattedBalance sum={available.user.toString()} token="dai" />}
        </Loading>
      }
      secondaryMetric={
        <Loading meta={withdrawPeriodDateMeta}>
          {withdrawPeriodDate &&
            `The plan expires ${new Date(withdrawPeriodDate.toNumber()).toLocaleDateString()}`}
        </Loading>
      }
      actionButtons={[<PTokenSellingButton fullWidth color="primary" variant="contained" />]}
    />
  );
}

function Distribution() {
  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, []);
  const [accumulated, accumulatedMeta] = useSubscribable(
    () => (account ? api.tokens.getAccumulatedUserDistributions$(account) : of(new BN(0))),
    [api, account],
    new BN(0),
  );
  const [accumulatedInDai, accumulatedInDaiMeta] = useSubscribable(
    () =>
      api.fundsModule.getAvailableBalanceIncreasing$(
        account || zeroAddress,
        accumulated.toString(),
        '0',
      ),
    [api, account, accumulated.toString()],
  );

  return (
    <AccountMetricCard
      title="Distribution"
      primaryMetric={
        <Loading meta={accumulatedInDaiMeta}>
          {accumulatedInDai && <FormattedBalance sum={accumulatedInDai.toString()} token="dai" />}
        </Loading>
      }
      secondaryMetric={
        <Loading meta={accumulatedMeta}>
          <FormattedBalance sum={accumulated.toString()} token="ptk" />
        </Loading>
      }
      actionButtons={[
        <WithdrawDistributionsButton fullWidth color="primary" variant="contained" />,
      ]}
    />
  );
}
