import * as React from 'react';

import { MyLoans } from 'features/loans';
import { WithAccount } from 'app/components/WithAccount/WithAccount';

export function MyLoansPage() {
  return <WithAccount>{({ account }) => <MyLoans account={account} />}</WithAccount>;
}
