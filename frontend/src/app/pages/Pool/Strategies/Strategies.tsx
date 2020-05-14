import React from 'react';

import { Grid } from 'components';

import { ShareBuyingStrategy } from './ShareBuyingStrategy';
import { BorrowingStrategy } from './BorrowingStrategy';
import { LendingStrategy } from './LendingStrategy';

export function Strategies() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <ShareBuyingStrategy />
      </Grid>
      <Grid item xs={4}>
        <LendingStrategy />
      </Grid>
      <Grid item xs={4}>
        <BorrowingStrategy />
      </Grid>
    </Grid>
  );
}
