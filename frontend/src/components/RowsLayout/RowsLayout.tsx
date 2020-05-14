import * as React from 'react';
import cn from 'classnames';
import { GetProps } from '_helpers';
import Grid from '@material-ui/core/Grid/Grid';

import { makeStyles } from 'utils/styles';
import { attachStaticFields } from 'utils/object';

import { useStyles } from './RowsLayout.style';

interface IProps {
  children?: React.ReactNode;
  spacing?: GetProps<typeof Grid>['spacing'];
  className?: string;
}

function RowsLayoutComponent({ children, spacing, className }: IProps) {
  const classes = useStyles();

  return (
    <div className={cn(classes.root, className)}>
      <Grid container direction="column" spacing={spacing} className={classes.container}>
        {children}
      </Grid>
    </div>
  );
}

const useContentStyles = makeStyles(
  {
    root: {
      width: `100%`,
    },
  },
  { name: 'ContentBlock' },
);

function ContentBlock(props: { children: React.ReactNode; fillIn?: boolean }) {
  const classes = useContentStyles();
  const { fillIn, children } = props;

  return (
    <Grid item xs={fillIn} className={classes.root}>
      {children}
    </Grid>
  );
}

export const RowsLayout = attachStaticFields(RowsLayoutComponent, { ContentBlock });
