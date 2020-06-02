import React from 'react';
import cn from 'classnames';

import { useStyles } from './Hint.style';

type Props = React.PropsWithChildren<{
  size?: 'small' | 'medium';
}>;

function Hint(props: Props) {
  const { children, size = 'medium' } = props;
  const classes = useStyles();

  const className = cn(classes.root, {
    [classes.isSmall]: size === 'small',
    [classes.isMedium]: size === 'medium',
  });

  return <div className={className}>{children}</div>;
}

export { Hint };
