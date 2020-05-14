import BN from 'bn.js';
import React from 'react';
import moment from 'moment';

import { Loading, CashMetric, Metric } from 'components';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { usePoolMetricsSubscription, usePoolMetricByDateSubscription } from 'generated/gql/pool';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { useAvgPoolAPR } from 'model/hooks';

const tKeys = tKeysAll.app.components.header;

export function TotalBalance() {
  const { t } = useTranslate();

  const { lBalance, lDebt, gqlResult } = usePoolInfo();
  const { lBalanceDayAgo, lDebtDayAgo, gqlResultDayAgo } = usePoolInfoDayAgo();

  return (
    <Loading gqlResults={[gqlResult, gqlResultDayAgo]}>
      <CashMetric
        title={t(tKeys.total.getKey())}
        value={new BN(lBalance).add(new BN(lDebt)).toString()}
        previousValue={new BN(lBalanceDayAgo).add(new BN(lDebtDayAgo)).toString()}
        token="dai"
      />
    </Loading>
  );
}

export function DepositPlusWithdraw24Volume() {
  const { t } = useTranslate();

  const { depositSum, withdrawSum, gqlResult } = usePoolInfo();
  const { depositSumDayAgo, withdrawSumDayAgo, gqlResultDayAgo } = usePoolInfoDayAgo();

  const curValue = new BN(depositSum).add(new BN(withdrawSum));
  const prevValue = new BN(depositSumDayAgo).add(new BN(withdrawSumDayAgo));

  return (
    <Loading gqlResults={[gqlResult, gqlResultDayAgo]}>
      <CashMetric
        title={t(tKeys.depositPlusWithdraw24Volume.getKey())}
        value={curValue.sub(prevValue).toString()}
        token="dai"
      />
    </Loading>
  );
}

export function AvailableBalance() {
  const { t } = useTranslate();

  const { lBalance, gqlResult } = usePoolInfo();
  const { lBalanceDayAgo, gqlResultDayAgo } = usePoolInfoDayAgo();

  return (
    <Loading gqlResults={[gqlResult, gqlResultDayAgo]}>
      <CashMetric
        title={t(tKeys.availableBalance.getKey())}
        value={lBalance}
        previousValue={lBalanceDayAgo}
        token="dai"
      />
    </Loading>
  );
}

export function Loans() {
  const { t } = useTranslate();

  const { lDebt, gqlResult } = usePoolInfo();
  const { lDebtDayAgo, gqlResultDayAgo } = usePoolInfoDayAgo();

  return (
    <Loading gqlResults={[gqlResult, gqlResultDayAgo]}>
      <CashMetric
        title={t(tKeys.issued.getKey())}
        value={lDebt}
        previousValue={lDebtDayAgo}
        token="dai"
      />
    </Loading>
  );
}

export function Apr() {
  const { t } = useTranslate();

  const avgPoolGqlResult = useAvgPoolAPR();

  return (
    <Loading gqlResults={avgPoolGqlResult}>
      <Metric
        title={t(tKeys.apr.getKey())}
        value={`~${avgPoolGqlResult.data?.formattedApr || 'unknown'}%`}
      />
    </Loading>
  );
}

// TODO use real data
export function Yield() {
  const { t } = useTranslate();

  return (
    <Loading gqlResults={[]}>
      <Metric title={t(tKeys.yield.getKey())} value="—" />
      {/* <CashMetric
        title={t(tKeys.yield.getKey())}
        value={decimalsToWei(18)
          .muln(1234)
          .toString()}
        token="dai"
      /> */}
    </Loading>
  );
}

// TODO use real data
export function TotalDistributed() {
  const { t } = useTranslate();

  return (
    <Loading gqlResults={[]}>
      <Metric title={t(tKeys.distributed.getKey())} value="—" />
      {/* <CashMetric
        title={t(tKeys.distributed.getKey())}
        value={decimalsToWei(18)
          .muln(1234)
          .toString()}
        token="dai"
      /> */}
    </Loading>
  );
}

export function Members() {
  const { t } = useTranslate();

  const { usersLength, gqlResult } = usePoolInfo();

  return (
    <Loading gqlResults={gqlResult}>
      <Metric title={t(tKeys.members.getKey())} value={usersLength} />
    </Loading>
  );
}

export function TotalPtkSupply() {
  const { t } = useTranslate();
  const api = useApi();

  const [totalSupply, totalSupplyMeta] = useSubscribable(
    () => api.tokens.getTotalSupply$('ptk'),
    [api],
    new BN(0),
  );

  return (
    <Loading meta={totalSupplyMeta}>
      <CashMetric title={t(tKeys.shares.getKey())} value={totalSupply.toString()} token="ptk" />
    </Loading>
  );
}

function usePoolInfo() {
  const poolMetricsGqlResult = usePoolMetricsSubscription();

  const { lBalance, lDebt, lProposals, usersLength, depositSum, withdrawSum } = poolMetricsGqlResult
    .data?.pools[0] || {
    lBalance: '0',
    lDebt: '0',
    lProposals: '0',
    usersLength: '0',
    depositSum: '0',
    withdrawSum: '0',
  };

  return {
    lBalance,
    lDebt,
    lProposals,
    usersLength,
    depositSum,
    withdrawSum,
    gqlResult: poolMetricsGqlResult,
  };
}

function usePoolInfoDayAgo() {
  const lastDay = moment()
    .subtract(1, 'day')
    .unix(); // Date in seconds

  const poolMetricsDayAgoGqlResult = usePoolMetricByDateSubscription({
    variables: {
      date: `0x${lastDay.toString(16)}`, // Date in seconds
    },
  });

  const lBalanceDayAgo = poolMetricsDayAgoGqlResult.data?.pools[0]?.lBalance || '0';
  const lDebtDayAgo = poolMetricsDayAgoGqlResult.data?.pools[0]?.lDebt || '0';
  const lProposalsDayAgo = poolMetricsDayAgoGqlResult.data?.pools[0]?.lProposals || '0';
  const usersLengthDayAgo = poolMetricsDayAgoGqlResult.data?.pools[0]?.usersLength || '0';
  const depositSumDayAgo = poolMetricsDayAgoGqlResult.data?.pools[0]?.depositSum || '0';
  const withdrawSumDayAgo = poolMetricsDayAgoGqlResult.data?.pools[0]?.withdrawSum || '0';

  return {
    lBalanceDayAgo,
    lDebtDayAgo,
    lProposalsDayAgo,
    usersLengthDayAgo,
    depositSumDayAgo,
    withdrawSumDayAgo,
    gqlResultDayAgo: poolMetricsDayAgoGqlResult,
  };
}
