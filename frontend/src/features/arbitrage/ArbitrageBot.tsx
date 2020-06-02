import * as React from 'react';
import * as R from 'ramda';
import { of } from 'rxjs';

import { Loading, Grid, Card, CardContent, Typography, Hint } from 'components';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { decimalsToWei } from 'utils/bn';
import { makeStyles } from 'utils/styles';

import { SwapFormData, SwapOptionsForm } from './SwapOptionsForm';
import { SummaryTermsView } from './SummaryTermsView';
import { ProtocolTermsView } from './ProtocolTermsView';
import { SwapRunner } from './SwapRunner';

const useStyles = makeStyles({
  fullHeight: {
    minHeight: '100%',
  },
});

interface Props {
  account: string;
  executor: string;
}

export function ArbitrageBot({ account, executor }: Props) {
  const classes = useStyles();
  const [swapOptions, setSwapOptions] = React.useState<SwapFormData>();
  const api = useApi();

  const [terms, termsMeta] = useSubscribable(
    () =>
      swapOptions
        ? api.arbitrageModule.getSwapTerms$({
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
            executorAddress: executor,
          })
        : of(null),
    [api, R.toString(swapOptions)],
    null,
  );

  return (
    <Grid container spacing={2}>
      <Grid item xs={8}>
        <Card className={classes.fullHeight}>
          <CardContent>
            <SwapOptionsForm onSubmit={setSwapOptions} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={4}>
        <Card className={classes.fullHeight}>
          <CardContent>
            <Typography variant="h5">Run auto swap</Typography>
          </CardContent>
          <CardContent>
            <SwapRunner terms={terms} account={account} executor={executor} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Loading component={Hint} meta={termsMeta}>
          {terms && (
            <Grid container spacing={2}>
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
            </Grid>
          )}
        </Loading>
      </Grid>
    </Grid>
  );
}
