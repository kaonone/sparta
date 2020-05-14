import React from 'react';

import { Grid, Typography } from 'components';
import { MyLoans, MyGuarantees } from 'features/loans';

import { WithAccount } from '../../components/WithAccount/WithAccount';
import { Dashboard } from './Dashboard';

export function AccountPage() {
  return (
    <WithAccount>
      {({ account }) => (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Dashboard />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Lending
            </Typography>
            <MyGuarantees account={account} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Borrowing
            </Typography>
            <MyLoans account={account} />
          </Grid>
        </Grid>
      )}
    </WithAccount>
  );
}
