import * as React from 'react';
import { SnackbarProvider, WithSnackbarProps } from 'notistack';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';

import { useStyles } from './Snackbar.style';

interface IProps {
  children: React.ReactElement;
}

function Snackbar(props: IProps) {
  const { children } = props;
  const classes = useStyles();
  const notistackRef: React.RefObject<WithSnackbarProps> = React.createRef();

  const handleButtonClick = React.useCallback(
    (key?: string | number) => () => {
      notistackRef.current && notistackRef.current.closeSnackbar(key);
    },
    [notistackRef.current],
  );

  const renderButton = React.useMemo(
    (key?: string | number) => () => (
      <IconButton key="close" aria-label="close" color="inherit" onClick={handleButtonClick(key)}>
        <CloseIcon className={classes.icon} />
      </IconButton>
    ),
    [handleButtonClick, classes],
  );

  return (
    <SnackbarProvider
      maxSnack={3}
      ref={notistackRef}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      action={renderButton}
    >
      {children}
    </SnackbarProvider>
  );
}

export { Snackbar };
