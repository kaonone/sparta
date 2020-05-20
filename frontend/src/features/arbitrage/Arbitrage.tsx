import * as React from 'react';
import * as R from 'ramda';
import { of } from 'rxjs';
import BN from 'bn.js';

import { Loading, Box, Hint } from 'components';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { decimalsToWei } from 'utils/bn';
import { CreateArbitrageExecutorButton } from 'features/createArbitrageExecutor';
import { PTokenBuyingButton } from 'features/cashExchange';

import { SwapFormData, SwapOptionsForm } from './SwapOptionsForm';

export function Arbitrage({ account }: { account: string }) {
  const [swapOptions, setSwapOptions] = React.useState<SwapFormData>();
  const api = useApi();

  const [terms, termsMeta] = useSubscribable(
    () =>
      swapOptions
        ? api.flashLoanModule.getSwapTerms$({
            amountIn: swapOptions.amountIn,
            additionalSlippageFrom:
              parseInt(swapOptions.additionalSlippageFrom, 10) /
              decimalsToWei(swapOptions.slippageDecimals).toNumber(),
            additionalSlippageTo:
              parseInt(swapOptions.additionalSlippageTo, 10) /
              decimalsToWei(swapOptions.slippageDecimals).toNumber(),
            protocolFrom: swapOptions.protocolFrom,
            protocolTo: swapOptions.protocolTo,
            tokenFrom: swapOptions.tokenFrom,
            tokenTo: swapOptions.tokenTo,
          })
        : of(null),
    [api, R.toString(swapOptions)],
  );

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
      {executorAddress && (
        <>
          <Box maxWidth={750} ml="auto" mr="auto">
            <SwapOptionsForm onSubmit={setSwapOptions} />
          </Box>
          <Loading meta={termsMeta}>{terms && <pre>{JSON.stringify(terms, null, 2)}</pre>}</Loading>
        </>
      )}
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
