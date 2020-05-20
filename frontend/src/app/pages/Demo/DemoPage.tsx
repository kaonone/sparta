import * as React from 'react';
import * as R from 'ramda';
import { of } from 'rxjs';

import { Typography, Loading, Box } from 'components';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { decimalsToWei } from 'utils/bn';

import { WithAccount } from '../../components/WithAccount/WithAccount';
import { SwapFormData, SwapOptionsForm } from './SwapOptionsForm';

export function DemoPage() {
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

  return (
    <WithAccount>
      <Typography variant="h4" gutterBottom>
        Page for developers
      </Typography>
      <Box maxWidth={750} ml="auto" mr="auto">
        <SwapOptionsForm onSubmit={setSwapOptions} />
      </Box>
      <Loading meta={termsMeta}>{terms && <pre>{JSON.stringify(terms, null, 2)}</pre>}</Loading>
    </WithAccount>
  );
}
