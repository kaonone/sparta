import React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';

import { ContainedCircleArrow, OutlinedCircleArrow } from 'components/icons';

import { useStyles } from './ExpansionPanel.style';

interface IProps {
  title: React.ReactNode;
  details: React.ReactNode;
  showPreview?: boolean;
  detailsClassName?: string;
  expanded?: boolean;
}

function ExpansionPanelComponent(props: IProps) {
  const { title, details, showPreview, detailsClassName, expanded: defaultExpanded } = props;
  const classes = useStyles();
  const [expanded, setExpanded] = React.useState(!!defaultExpanded);

  const handleExpansionPanelChange = (_event: React.ChangeEvent<{}>, isExpanded: boolean) => {
    setExpanded(isExpanded);
  };

  return (
    <ExpansionPanel
      expanded={expanded}
      onChange={handleExpansionPanelChange}
      className={classes.root}
    >
      <ExpansionPanelSummary
        className={classes.summary}
        aria-controls="panel1a-content"
        id="panel1a-header"
      >
        <Grid item xs className={classes.summaryContent}>
          <Typography noWrap={!!showPreview}>
            {expanded && <ContainedCircleArrow className={classes.toggleExpandIcon} />}
            {!expanded && <OutlinedCircleArrow className={classes.toggleExpandIcon} />}
            <span className={classes.summaryTitle}>{title}</span>
            {!expanded && showPreview && details}
          </Typography>
        </Grid>
      </ExpansionPanelSummary>
      <ExpansionPanelDetails className={detailsClassName}>{details}</ExpansionPanelDetails>
    </ExpansionPanel>
  );
}

export { ExpansionPanelComponent as ExpansionPanel };
