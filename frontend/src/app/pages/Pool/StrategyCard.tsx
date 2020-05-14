import React from 'react';

import { Card, CardContent, Typography } from 'components';
import { makeStyles } from 'utils/styles';

interface StrategyCardProps {
  title: React.ReactNode;
  primaryMetric: React.ReactNode;
  secondaryMetric: React.ReactNode;
  description: React.ReactNode;
  actionButton: React.ReactNode;
}

export function StrategyCard(props: StrategyCardProps) {
  const { actionButton, description, primaryMetric, secondaryMetric, title } = props;
  const classes = useStyles();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h3" align="center" paragraph>
          {title}
        </Typography>
        <Typography variant="h4" component="p" align="center" gutterBottom>
          {primaryMetric}
        </Typography>
        <Typography variant="h5" align="center" paragraph>
          {secondaryMetric}
        </Typography>
        <Typography align="center">{description}</Typography>
      </CardContent>
      <CardContent className={classes.actions}>{actionButton}</CardContent>
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
