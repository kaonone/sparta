import React from 'react';
import cn from 'classnames';
import CallMadeIcon from '@material-ui/icons/CallMade';

import { useStyles } from './Profit.style';

interface IProps {
  value: string;
  variant: 'decrease' | 'increase';
  className?: string;
}

function Profit(props: IProps) {
  const { value, variant, className } = props;
  const classes = useStyles();

  return value ? (
    <span className={cn(classes.root, classes[variant], className)}>
      <CallMadeIcon className={cn(classes.icon, classes[variant])} />
      {`${value}%`}
    </span>
  ) : null;
}

export { Profit };
