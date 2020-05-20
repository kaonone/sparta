import * as React from 'react';
import * as R from 'ramda';
import { of } from 'rxjs';

import { Loading, Box, Grid, Card, CardContent } from 'components';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { decimalsToWei } from 'utils/bn';

import { SwapFormData, SwapOptionsForm } from './SwapOptionsForm';
import { SummaryTermsView } from './SummaryTermsView';
import { ProtocolTermsView } from './ProtocolTermsView';

export function ArbitrageBot() {
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
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box maxWidth={750} ml="auto" mr="auto">
              <SwapOptionsForm onSubmit={setSwapOptions} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Loading meta={termsMeta}>
        {terms && (
          <>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <SummaryTermsView summary={terms.summary} request={terms.request} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card>
                <CardContent>
                  <ProtocolTermsView
                    terms={terms.from}
                    additionalSlippage={terms.request.additionalSlippageFrom}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card>
                <CardContent>
                  <ProtocolTermsView
                    terms={terms.to}
                    additionalSlippage={terms.request.additionalSlippageTo}
                  />
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Loading>
    </Grid>
  );
}
