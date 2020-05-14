import React, { useCallback } from 'react';
import Countdown, { CountdownRenderProps } from 'react-countdown-now';
import BN from 'bn.js';
import { of } from 'rxjs';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { Loading, MetricsList, CashMetric, Metric } from 'components';

const tKeys = tKeysAll.features.distributions;

type Props = Pick<React.ComponentProps<typeof MetricsList>, 'orientation' | 'withDividers'>;

function DistributionMetrics(props: Props) {
  const { t } = useTranslate();

  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, []);
  const [accumulated, accumulatedMeta] = useSubscribable(
    () => (account ? api.tokens.getAccumulatedUserDistributions$(account) : of(new BN(0))),
    [api, account],
    new BN(0),
  );
  const [accumulatedInDaiInfo, accumulatedInDaiMeta] = useSubscribable(
    () => api.fundsModule.getPtkToDaiExitInfo$(accumulated.toString()),
    [api, accumulated.toString()],
  );

  const accumulatedInDai = accumulatedInDaiInfo?.total;

  const [nextDistributionTimestamp, nextDistributionTimestampMeta] = useSubscribable(
    () => api.tokens.getNextDistributionTimestamp$(),
    [api],
  );

  const countdownRenderer = useCallback(
    ({ completed, formatted: { hours, minutes, seconds } }: CountdownRenderProps) => {
      return (
        <span>
          {completed ? t(tKeys.awaitingDistribution.getKey()) : `${hours}:${minutes}:${seconds}`}
        </span>
      );
    },
    [t],
  );

  return (
    <MetricsList {...props}>
      <Loading meta={[accumulatedMeta, accumulatedInDaiMeta]}>
        {accumulatedInDai && (
          <CashMetric
            title={t(tKeys.accumulated.getKey())}
            value={accumulatedInDai.toString()}
            token="dai"
          />
        )}
      </Loading>
      <Loading meta={nextDistributionTimestampMeta}>
        {typeof nextDistributionTimestamp === 'number' && (
          <Metric
            title={t(tKeys.untilTheNextDistribution.getKey())}
            value={
              <Countdown
                daysInHours
                date={nextDistributionTimestamp * 1000}
                renderer={countdownRenderer}
              />
            }
          />
        )}
      </Loading>
    </MetricsList>
  );
}

export { DistributionMetrics };
