import * as React from 'react';
import { of } from 'rxjs';
import BN from 'bn.js';

import { SwapTerms } from 'model/types';
import { Button, Grid, Loading } from 'components';
import { useApi } from 'services/api';
import { useSubscribable, useCommunication, useOnChangeState } from 'utils/react';

import { SwapRunnerForm, RunnerFormData } from './SwapRunnerForm';
import { ApproveSwapTokensButton } from './ApproveSwapTokensButton';

interface Props {
  account: string;
  executor: string;
  terms: SwapTerms | null;
}

export function SwapRunner({ terms, executor, account }: Props) {
  const [formData, setFormData] = React.useState<RunnerFormData | null>(null);
  const api = useApi();

  const tokens = terms ? [terms.request.tokenFrom, terms.request.tokenTo] : [];
  const [isApproved, isApprovedMeta] = useSubscribable(
    () => (tokens.length ? api.arbitrageModule.getTokensApproved$(executor, tokens) : of(false)),
    [api, tokens.join()],
  );

  const stop = React.useCallback(() => setFormData(null), []);

  const needToApprove: boolean = Boolean(terms && !isApproved);
  const disableStart: boolean = !terms || needToApprove;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <SwapRunnerForm
          onSubmit={setFormData}
          disableSubmit={disableStart}
          additionalButton={
            <Loading meta={isApprovedMeta}>
              <ApproveSwapTokensButton
                account={account}
                executor={executor}
                tokens={tokens}
                fullWidth
                disabled={!needToApprove}
                variant="outlined"
                color="primary"
              >
                Approve tokens
              </ApproveSwapTokensButton>
            </Loading>
          }
          overrideSubmitButton={
            formData ? (
              <Button type="button" onClick={stop} fullWidth variant="contained" color="primary">
                Stop
              </Button>
            ) : (
              undefined
            )
          }
        />
      </Grid>
      {formData && (
        <Grid item xs={12}>
          <SwapSender
            executor={executor}
            terms={terms}
            minEarn={formData.minEarn}
            privateKey={formData.privateKey}
          />
        </Grid>
      )}
    </Grid>
  );
}

function SwapSender({ executor, minEarn, privateKey, terms }: SwapSenderProps) {
  const api = useApi();
  const [termsForSwap, setTermsForSwap] = React.useState<SwapTerms | null>(null);

  React.useEffect(() => {
    if (!termsForSwap && terms?.summary && new BN(terms.summary.earn).gt(new BN(minEarn))) {
      setTermsForSwap(terms);
    }
  }, [terms, minEarn]);

  const swap = React.useCallback(async () => {
    return (
      termsForSwap?.from &&
      termsForSwap?.to &&
      api.arbitrageModule.swap(privateKey, executor, termsForSwap.from, termsForSwap.to)
    );
  }, [privateKey, executor, api, termsForSwap]);

  const { execute, status } = useCommunication(swap, [swap]);

  useOnChangeState(
    status,
    (prev, cur) => prev === 'pending' && cur !== 'pending',
    () => setTermsForSwap(null),
  );

  React.useEffect(() => {
    termsForSwap && execute();
  }, [termsForSwap, execute]);

  return <noscript />;
}

interface SwapSenderProps {
  executor: string;
  terms: SwapTerms | null;
  minEarn: string;
  privateKey: string;
}
