import React from 'react';

import { MetricsList } from 'components';

import {
  Apr,
  AvailableBalance,
  Loans,
  Members,
  TotalBalance,
  DepositPlusWithdraw24Volume,
  TotalDistributed,
  TotalPtkSupply,
  Yield,
} from './metrics';

type Metric =
  | 'availableBalance'
  | 'depositPlusWithdraw24Volume'
  | 'investmentApr'
  | 'investmentYield'
  | 'loans'
  | 'members'
  | 'totalBalance'
  | 'totalDistributed'
  | 'totalPtkSupply';

const metrics: Record<Metric, JSX.Element> = {
  availableBalance: <AvailableBalance key="AvailableBalance" />,
  depositPlusWithdraw24Volume: <DepositPlusWithdraw24Volume key="DepositPlusWithdraw24Volume" />,
  investmentApr: <Apr key="Apr" />,
  investmentYield: <Yield key="Yield" />,
  loans: <Loans key="Loans" />,
  members: <Members key="Members" />,
  totalBalance: <TotalBalance key="TotalBalance" />,
  totalDistributed: <TotalDistributed key="TotalDistributed" />,
  totalPtkSupply: <TotalPtkSupply key="TotalPtkSupply" />,
};

type Props = Pick<React.ComponentProps<typeof MetricsList>, 'orientation' | 'withDividers'> & {
  includes: Metric[];
};

export function PoolMetrics({ includes, ...props }: Props) {
  return <MetricsList {...props}>{includes.map(metric => metrics[metric])}</MetricsList>;
}
