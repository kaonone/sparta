import React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';

import { ProgressBar } from './ProgressBar/ProgressBar';
import { useStyles } from './Progress.style';

interface IProps {
  progressInPercents: number;
  timeLeft?: number;
}

const tKeys = tKeysAll.features.loanApplications;

function Progress(props: IProps) {
  const { progressInPercents, timeLeft } = props;
  const classes = useStyles();
  const { t } = useTranslate();

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <ProgressBar title={t(tKeys.collateral.getKey())} value={progressInPercents} />
      </Grid>
      {timeLeft && (
        <Grid item xs={12}>
          <Grid container justify="space-between">
            <Grid item>
              <Typography component="span" variant="subtitle1" className={classes.timeLeftTitle}>
                {t(tKeys.timeLeft.getKey())}
              </Typography>
            </Grid>
            <Grid item>
              <Typography component="span" variant="subtitle1" className={classes.timeLeftValue}>
                {`${timeLeft}min`}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Grid>
  );
}

export { Progress };
