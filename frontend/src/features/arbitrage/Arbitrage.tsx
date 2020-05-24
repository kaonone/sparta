import * as React from 'react';

import { Loading, Box, Hint } from 'components';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { CreateArbitrageExecutorButton } from 'features/createArbitrageExecutor';
import { PTokenBuyingButton } from 'features/cashExchange';

import { ArbitrageBot } from './ArbitrageBot';

export function Arbitrage({ account }: { account: string }) {
  const api = useApi();

  const [executorAddress, executorAddressMeta] = useSubscribable(
    () => api.arbitrageModule.getExecutorAddress$(account),
    [api, account],
  );
  const [ptkBalance, ptkBalanceMeta] = useSubscribable(
    () => api.tokens.getBalance$('ptk', account),
    [api, account],
  );

  return (
    <Loading component={Hint} meta={[executorAddressMeta, ptkBalanceMeta]}>
      {executorAddress && <ArbitrageBot account={account} executor={executorAddress} />}
      {!executorAddress && ptkBalance?.isZero() && (
        <Hint>
          You need to buy share in fund
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
