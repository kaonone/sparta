import * as React from 'react';

import { Box, Hint, MetricsList, Metric, FormattedBalance } from 'components';
import { SwapTermsRequest, SummaryTerms } from 'services/api/modules/FlashLoanApi/types';
import { colors } from 'utils/styles';

export function SummaryTermsView({
  summary,
  request,
}: {
  summary: SummaryTerms | null;
  request: SwapTermsRequest;
}) {
  const { protocolFrom, protocolTo, tokenFrom, tokenTo, amountIn } = request;

  if (!summary) {
    return <Hint>Unsupported swap</Hint>;
  }

  const { earn, flashLoanFee, gasPrice } = summary;

  return (
    <MetricsList orientation="horizontal" withDividers>
      <Metric title="Swap from" value={protocolFrom} />
      <Metric title="to" value={protocolTo} />
      <Metric
        title="token"
        value={
          <FormattedBalance tokenAddress={tokenTo} sum="0">
            {({ tokenInfo }) => <span>{tokenInfo.symbol}</span>}
          </FormattedBalance>
        }
      />
      <Metric title="for" value={<FormattedBalance tokenAddress={tokenFrom} sum={amountIn} />} />
      <Metric
        title="flash loan fee"
        value={<FormattedBalance tokenAddress={tokenFrom} sum={flashLoanFee} />}
      />
      <Metric
        title="gas price"
        value={<FormattedBalance tokenAddress={tokenFrom} sum={gasPrice} />}
      />
      <Box color={colors.royalPurple}>
        <Metric title="min earn" value={<FormattedBalance tokenAddress={tokenFrom} sum={earn} />} />
      </Box>
    </MetricsList>
  );
}
