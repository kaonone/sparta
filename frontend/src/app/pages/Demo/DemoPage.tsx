import * as React from 'react';

import { Typography } from 'components';

import { WithAccount } from '../../components/WithAccount/WithAccount';

export function DemoPage() {
  return (
    <WithAccount>
      <Typography variant="h4" gutterBottom>
        Page for developers
      </Typography>
    </WithAccount>
  );
}
