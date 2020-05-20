import * as React from 'react';

import { Typography } from 'components';
import { Arbitrage } from 'features/arbitrage';

import { WithAccount } from '../../components/WithAccount/WithAccount';

export function ArbitragePage() {
  return (
    <WithAccount>
      {({ account }) => (
        <>
          <Typography variant="h4" gutterBottom>
            Arbitrage bot
          </Typography>
          <Arbitrage account={account} />
        </>
      )}
    </WithAccount>
  );
}
