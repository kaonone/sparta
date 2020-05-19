import * as React from 'react';

import { Typography, Loading } from 'components';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';

const ENV = {
  tokens: {
    dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
};

export function DemoPage() {
  const api = useApi();
  const [terms, termsMeta] = useSubscribable(
    () =>
      api.flashLoanModule.getSwapTerms$({
        amountIn: `10${'0'.repeat(18)}`,
        additionalSlippageFrom: 1,
        additionalSlippageTo: 1,
        protocolFrom: 'balancer',
        protocolTo: 'uniswap-v2',
        tokenFrom: ENV.tokens.dai,
        tokenTo: ENV.tokens.weth,
      }),
    [],
  );

  const [terms2, terms2Meta] = useSubscribable(
    () =>
      api.flashLoanModule.getSwapTerms$({
        amountIn: `10${'0'.repeat(18)}`,
        additionalSlippageFrom: 1,
        additionalSlippageTo: 1,
        protocolFrom: 'uniswap-v2',
        protocolTo: 'balancer',
        tokenFrom: ENV.tokens.dai,
        tokenTo: ENV.tokens.weth,
      }),
    [],
  );

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Page for developers
      </Typography>
      <Loading meta={termsMeta}>{terms && <pre>{JSON.stringify(terms, null, 2)}</pre>}</Loading>
      <Loading meta={terms2Meta}>{terms2 && <pre>{JSON.stringify(terms2, null, 2)}</pre>}</Loading>
    </div>
  );
}
