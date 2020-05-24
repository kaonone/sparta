import * as React from 'react';
import BN from 'bn.js';

import { Hint, MetricsList, Metric, FormattedBalance } from 'components';
import { ProtocolTerms } from 'model/types';
import { formatBalance } from 'utils/format';

export function ProtocolTermsView({
  terms,
  additionalSlippage,
}: {
  terms: ProtocolTerms | null;
  additionalSlippage: number;
}) {
  if (!terms) {
    return <Hint>Unsupported tokens</Hint>;
  }

  const { amountIn, minAmountOut, expectedSlippage, tokenFrom, tokenTo, type } = terms;

  const percentDecimals = 2;
  const formattedSlippage = formatBalance({
    amountInBaseUnits: new BN(
      (parseFloat(expectedSlippage) + additionalSlippage) * 10 ** percentDecimals,
    ).toString(),
    baseDecimals: percentDecimals,
  });

  return (
    <MetricsList orientation="vertical">
      <Metric title="Protocol" value={type} />
      <Metric title="in" value={<FormattedBalance tokenAddress={tokenFrom} sum={amountIn} />} />
      <Metric
        title="min out"
        value={
          new BN(minAmountOut).isZero() ? (
            'Insufficient funds'
          ) : (
            <FormattedBalance tokenAddress={tokenTo} sum={minAmountOut} />
          )
        }
      />
      <Metric title="slippage (uncludes additional)" value={`${formattedSlippage}%`} />
    </MetricsList>
  );
}
