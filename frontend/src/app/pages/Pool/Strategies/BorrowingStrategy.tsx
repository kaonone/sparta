import React from 'react';
import { of } from 'rxjs';
import BN from 'bn.js';

import { Loading, FormattedBalance } from 'components';
import { GetLoanButton } from 'features/cashExchange';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { formatBalance } from 'utils/format';

import { StrategyCard } from '../StrategyCard';

export function BorrowingStrategy() {
  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, []);

  const [maxAvailableLoanSize, maxAvailableLoanSizeMeta] = useSubscribable(
    () => (account ? api.loanModule.getMaxAvailableLoanSizeInDai$(account) : of(new BN(0))),
    [api, account],
    new BN(0),
  );

  const [loanConfig, loanConfigMeta] = useSubscribable(() => api.loanModule.getConfig$(), [api]);

  const formattedMinInterestApr = loanConfig
    ? formatBalance({
        amountInBaseUnits: loanConfig.limits.debtInterestMin
          .muln(10000)
          .div(loanConfig.debtInterestMultiplier),
        baseDecimals: 2,
      })
    : null;

  return (
    <StrategyCard
      title="Borrowing"
      primaryMetric={
        <Loading meta={maxAvailableLoanSizeMeta}>
          <FormattedBalance sum={maxAvailableLoanSize.toString()} token="dai" />
        </Loading>
      }
      secondaryMetric={
        <Loading meta={loanConfigMeta}>
          {formattedMinInterestApr && <span>min {formattedMinInterestApr}% APR</span>}
        </Loading>
      }
      description="Some text"
      actionButton={<GetLoanButton />}
    />
  );
}
