import * as React from 'react';
import { of } from 'rxjs';
import BN from 'bn.js';

import { Loading, Box, Hint } from 'components';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { CreateArbitrageExecutorButton } from 'features/createArbitrageExecutor';
import { PTokenBuyingButton } from 'features/cashExchange';

import { ArbitrageBot } from './ArbitrageBot';

export function Arbitrage({ account }: { account: string }) {
  const api = useApi();

  const [executorAddress, executorAddressMeta] = useSubscribable(
    () => api.flashLoanModule.getExecutorAddress$(account),
    [api, account],
  );
  const [ptkBalance, ptkBalanceMeta] = useSubscribable(
    () => of(new BN(100)),
    // () => api.tokens.getBalance$('ptk', account), // TODO uncomment
    [api, account],
  );

  return (
    <Loading component={Hint} meta={[executorAddressMeta, ptkBalanceMeta]}>
      {executorAddress && <ArbitrageBot />}
      {!executorAddress && ptkBalance?.isZero() && (
        <Hint>
          You need to buy share in pool
          <Box ml={2}>
            <PTokenBuyingButton variant="contained" color="primary" fullWidth={false} />
          </Box>
        </Hint>
      )}
      {!executorAddress && !ptkBalance?.isZero() && (
        <Hint>
          You need to create arbitrage executor
          <Box ml={2}>
            <CreateArbitrageExecutorButton variant="contained" color="primary" account={account}>
              Create executor
            </CreateArbitrageExecutorButton>
          </Box>
        </Hint>
      )}
    </Loading>
  );
}
