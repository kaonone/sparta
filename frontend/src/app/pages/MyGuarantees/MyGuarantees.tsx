import * as React from 'react';

import { MyGuarantees } from 'features/loans';
import { WithAccount } from 'app/components/WithAccount/WithAccount';

export function MyGuaranteesPage() {
  return <WithAccount>{({ account }) => <MyGuarantees account={account} />}</WithAccount>;
}
