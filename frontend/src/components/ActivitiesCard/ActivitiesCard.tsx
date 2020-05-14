import * as React from 'react';
import Grid from '@material-ui/core/Grid';

import { ExpansionPanel } from 'components/ExpansionPanel/ExpansionPanel';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';

import { useStyles } from './ActivitiesCard.style';

interface IOwnProps {
  metricsList: React.ReactNode[];
  expansionPanelDetails?: string;
  asideContent: React.ReactNode;
}

const tKeys = tKeysAll.components.activitiesCard;

function ActivitiesCard(props: IOwnProps) {
  const { metricsList, expansionPanelDetails, asideContent } = props;
  const { t } = useTranslate();
  const classes = useStyles();

  return (
    <Grid className={classes.root} container wrap="nowrap">
      <Grid item xs={9} className={classes.mainInformation}>
        <Grid container spacing={3} className={classes.metrics}>
          {metricsList.map((metric, index) => (
            <Grid key={index} item xs>
              {metric}
            </Grid>
          ))}
          {expansionPanelDetails && (
            <Grid item xs={12}>
              <ExpansionPanel
                title={`${t(tKeys.expansionPanelTitle.getKey())}: `}
                details={expansionPanelDetails}
                showPreview
              />
            </Grid>
          )}
        </Grid>
      </Grid>
      <Grid item xs={3} className={classes.asideContent}>
        {asideContent}
      </Grid>
    </Grid>
  );
}

export { ActivitiesCard };
