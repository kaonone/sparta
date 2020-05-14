import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import Divider from '@material-ui/core/Divider';

import { useStyles } from './MetricsList.style';

type Orientation = 'vertical' | 'horizontal';

interface IProps {
  className?: string;
  orientation: Orientation;
  withDividers?: boolean;
  children: React.ReactNode;
}

const dividerOrientation: Record<Orientation, Orientation> = {
  horizontal: 'vertical',
  vertical: 'horizontal',
};

const gridDirection: Record<Orientation, 'column' | 'row'> = {
  horizontal: 'row',
  vertical: 'column',
};

function MetricsList(props: IProps) {
  const { className, orientation, withDividers } = props;
  const classes = useStyles();
  // eslint-disable-next-line react/destructuring-assignment
  const children = React.Children.toArray(props.children);

  return (
    <Grid container spacing={2} className={className} direction={gridDirection[orientation]}>
      {children.map((child, index) => (
        <React.Fragment key={index}>
          {!!index && withDividers && (
            <Grid item className={classes.dividerItem}>
              <Divider orientation={dividerOrientation[orientation]} className={classes.divider} />
            </Grid>
          )}
          <Grid item className={classes.metric}>
            {child}
          </Grid>
        </React.Fragment>
      ))}
    </Grid>
  );
}

export { MetricsList };
