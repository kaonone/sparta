import React from 'react';

import { Card, CardContent, Typography, Grid } from 'components';
import { makeStyles } from 'utils/styles';

interface AccountMetricCardProps {
  title: React.ReactNode;
  primaryMetric: React.ReactNode;
  secondaryMetric: React.ReactNode;
  description?: React.ReactNode;
  actionButtons: React.ReactNode[];
}

export function AccountMetricCard(props: AccountMetricCardProps) {
  const { actionButtons, description, primaryMetric, secondaryMetric, title } = props;
  const classes = useStyles();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h3" align="center" paragraph>
          {title}
        </Typography>
        <Typography variant="h4" component="div" align="center" gutterBottom>
          {primaryMetric}
        </Typography>
        <Typography variant="h5" component="div" align="center" paragraph={!!description}>
          {secondaryMetric}
        </Typography>
        {description && <Typography align="center">{description}</Typography>}
      </CardContent>
      <CardContent className={classes.actions}>
        <Grid container spacing={2}>
          {actionButtons.map((button, index) => (
            <Grid item xs key={index}>
              {button}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

const useStyles = makeStyles({
  card: {
    height: '100%',
  },
  actions: {
    marginTop: 'auto',
  },
});
