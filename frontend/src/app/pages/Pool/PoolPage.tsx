import React from 'react';

import { Loading, Grid } from 'components';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { PoolMetrics } from 'features/poolInfo';

import { Strategies } from './Strategies/Strategies';

export function PoolPage() {
  const api = useApi();
  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);

  return (
    <Loading meta={accountMeta}>
      {account ? (
        <Strategies />
      ) : (
        <Grid container>
          <PoolMetrics
            orientation="vertical"
            includes={['availableBalance', 'investmentYield', 'members']}
          />
        </Grid>
      )}
    </Loading>
  );
}
