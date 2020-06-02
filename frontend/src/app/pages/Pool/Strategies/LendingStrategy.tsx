import React from 'react';
import { Link } from 'react-router-dom';
import BN from 'bn.js';

import { Button, Loading } from 'components';
import { routes } from 'app/routes';
import { usePoolMetricsSubscription } from 'generated/gql/pool';
import { formatBalance } from 'utils/format';
import { useSubscribable } from 'utils/react';
import { useApi } from 'services/api';

import { StrategyCard } from '../StrategyCard';

export function LendingStrategy() {
  const api = useApi();
  const [loanConfig, loanConfigMeta] = useSubscribable(() => api.loanModule.getConfig$(), [api]);

  const poolMetricsResult = usePoolMetricsSubscription();

  const proposalsCount = poolMetricsResult.data?.pools[0]?.proposalsCount || '0';
  const maxProposalInterest = poolMetricsResult.data?.pools[0]?.maxProposalInterest || '0';

  const formattedMaxProposalInterest = loanConfig
    ? formatBalance({
        amountInBaseUnits: new BN(maxProposalInterest)
          .muln(10000)
          .div(loanConfig.debtInterestMultiplier),
        baseDecimals: 2,
      })
    : null;

  return (
    <StrategyCard
      title="Lending"
      primaryMetric={
        <Loading gqlResults={poolMetricsResult}>
          <span>{proposalsCount} proposals</span>
        </Loading>
      }
      secondaryMetric={
        <Loading meta={loanConfigMeta}>
          {formattedMaxProposalInterest && <span>max {formattedMaxProposalInterest}% APR</span>}
        </Loading>
      }
      description="High interest, high risk"
      actionButton={
        <Button
          component={Link}
          fullWidth
          color="primary"
          variant="contained"
          to={routes.proposals.getRedirectPath()}
        >
          Lend
        </Button>
      }
    />
  );
}
