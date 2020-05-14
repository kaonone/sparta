import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';

import { useStyles } from './ProgressBar.style';

interface IProps {
  title: string;
  value: number;
}

function ProgressBar(props: IProps) {
  const { title, value } = props;
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Grid container justify="space-between" wrap="nowrap">
        <Typography component="span" variant="subtitle1" className={classes.title}>
          {title}
        </Typography>
        <Typography component="span" variant="subtitle1" className={classes.percentValue}>
          {`${value}%`}
        </Typography>
      </Grid>
      <LinearProgress
        value={value}
        variant="determinate"
        classes={{ root: classes.progressRoot, barColorPrimary: classes.progressBar }}
      />
    </div>
  );
}

export { ProgressBar };
