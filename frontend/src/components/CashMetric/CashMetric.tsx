import React from 'react';
import BN from 'bn.js';

import { Metric } from 'components/Metric/Metric';
import { FormattedBalance } from 'components/FormattedBalance/FormattedBalance';
import { Token } from 'model/types';
import { Growth } from 'components/Growth/Growth';

export interface ICashMetricProps {
  title: React.ReactNode;
  value: string;
  previousValue?: string;
  primaryValue?: 'value' | 'previousValue';
  token: Token;
  needed?: string;
  icon?: React.ReactNode;
}

function CashMetric(props: ICashMetricProps) {
  const { title, value, previousValue, needed, token, icon, primaryValue = 'value' } = props;

  const primary: Record<'value' | 'previousValue', string> = {
    previousValue: previousValue || value,
    value,
  };

  return (
    <Metric
      title={title}
      value={<FormattedBalance sum={primary[primaryValue]} token={token} />}
      icon={icon}
      subValue={
        (previousValue && <Growth current={new BN(value)} previous={new BN(previousValue)} />) ||
        (needed && (
          <>
            <FormattedBalance sum={needed} token={token} /> needed
          </>
        ))
      }
    />
  );
}

export { CashMetric };
