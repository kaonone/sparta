import * as React from 'react';

import { Arbitrage } from 'features/arbitrage';

import { WithAccount } from '../../components/WithAccount/WithAccount';

export function ArbitragePage() {
  return <WithAccount>{({ account }) => <Arbitrage account={account} />}</WithAccount>;
}
