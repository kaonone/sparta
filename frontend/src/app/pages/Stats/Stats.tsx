import * as React from 'react';

import { Grid, Card, CardContent } from 'components';
import { PoolBalanceChart } from 'features/balance';
import { makeStyles } from 'utils/styles';
import { PoolMetrics } from 'features/poolInfo';

export function StatsPage() {
  const classes = useStyles();
  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <PoolBalanceChart />
      </Grid>
      <Grid item xs={6}>
        <Card className={classes.card}>
          <CardContent>
            <PoolMetrics
              orientation="vertical"
              includes={['availableBalance', 'depositPlusWithdraw24Volume', 'members']}
            />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6}>
        <Card className={classes.card}>
          <CardContent>
            <PoolMetrics
              orientation="vertical"
              includes={['investmentApr', 'loans', 'totalPtkSupply']}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

const useStyles = makeStyles(() => ({
  card: {
    height: '100%',
  },
}));
