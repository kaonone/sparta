import { interval } from 'rxjs';
import { useState, useMemo } from 'react';
import * as R from 'ramda';
import BN from 'bn.js';

import { useDefiAprsFromDateSubscription } from 'generated/gql/pool';
import { useSubscribable, useOnChangeState } from 'utils/react';
import { formatBalance } from 'utils/format';

const reloadDelay = 60 * 60 * 1000;

export function useAvgPoolAPR() {
  const [fromDate, setFromDate] = useState(getFromDate);

  const [intervalIndex] = useSubscribable(() => interval(reloadDelay), []);
  useOnChangeState(intervalIndex, R.compose(R.not, R.equals), () => setFromDate(getFromDate()));

  const result = useDefiAprsFromDateSubscription({
    variables: { fromDate: fromDate.toString() },
  });

  const reduced = useMemo(
    () =>
      result.data?.defiAPRs.reduce(
        (acc, cur) => {
          const duration = new BN(cur.duration);
          const apr = new BN(cur.apr);
          return {
            numerator: acc.numerator.add(apr.mul(duration)),
            denominator: acc.denominator.add(duration),
          };
        },
        {
          numerator: new BN(0),
          denominator: new BN(0),
        },
      ),
    [result.data?.defiAPRs],
  );

  const aprDecimals = result.data?.defiAPRs[0]?.aprDecimals || 0;
  const apr = useMemo(
    () =>
      !reduced || reduced.denominator.isZero()
        ? new BN(0)
        : reduced.numerator.div(reduced.denominator),
    [reduced],
  );

  const formattedApr = formatBalance({
    amountInBaseUnits: apr,
    baseDecimals: aprDecimals,
  });

  return { ...result, data: result.data ? { apr, aprDecimals, formattedApr } : undefined };
}

function getFromDate(): BN {
  return new BN(Date.now()).divn(1000).subn(24 * 60 * 60);
}
