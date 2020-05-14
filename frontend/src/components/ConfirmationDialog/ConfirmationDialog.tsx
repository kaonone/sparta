import React, { useCallback } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import CircularProgress from '@material-ui/core/CircularProgress';
import Drawer from '@material-ui/core/Drawer';

import { useCommunication, ISubscriptionMeta } from 'utils/react';
import { Loading } from 'components/Loading';
import { Hint } from 'components/Hint/Hint';
import { WithDarkTheme } from 'utils/styles';

type AsyncMessage = [string, ISubscriptionMeta];

interface IProps {
  modalType?: 'dialog' | 'drawer';
  isOpen: boolean;
  title?: string;
  message: string | AsyncMessage;
  yesText: string;
  noText?: string;
  onConfirm: () => Promise<void>;
  onCancel?: () => void;
}

function ConfirmationDialog(props: IProps) {
  const {
    onCancel,
    onConfirm,
    isOpen,
    title,
    message,
    noText,
    yesText,
    modalType = 'drawer',
  } = props;

  const communication = useCommunication(onConfirm, []);
  const { status, error } = communication;

  const handleCancel = useCallback(() => {
    onCancel && onCancel();
    communication.reset();
  }, [onCancel, communication.reset]);

  const messageLoaded = typeof message === 'string' || message[1].loaded;

  const Wrapper = React.useMemo(
    () =>
      ({
        dialog: ({ children }: { children: React.ReactNode }) => (
          <Dialog fullWidth maxWidth="sm" open={isOpen} onClose={handleCancel}>
            <DialogContent>{children}</DialogContent>
          </Dialog>
        ),
        drawer: ({ children }: { children: React.ReactNode }) => (
          <WithDarkTheme>
            <Drawer open={isOpen} anchor="right" onClose={handleCancel}>
              {children}
            </Drawer>
          </WithDarkTheme>
        ),
      }[modalType]),
    [modalType, isOpen, handleCancel],
  );

  return (
    <Wrapper>
      <Grid container justify="center" spacing={2}>
        {title && (
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              {title}
            </Typography>
          </Grid>
        )}
        <Grid item xs={12}>
          {typeof message === 'string' ? (
            <Typography>{message}</Typography>
          ) : (
            <Loading component={Hint} meta={message[1]}>
              <Typography>{message[0]}</Typography>
            </Loading>
          )}
        </Grid>
        {communication.status === 'error' && error && (
          <Grid item xs={12}>
            <Hint>
              <Typography color="error">{error}</Typography>
            </Hint>
          </Grid>
        )}
        {onCancel && (
          <Grid item xs={6}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={handleCancel}
              disabled={status === 'pending'}
            >
              {noText || 'Cancel'}
            </Button>
          </Grid>
        )}
        <Grid item xs={6}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
            onClick={communication.execute}
            disabled={status === 'pending' || !messageLoaded}
          >
            {status === 'pending' ? <CircularProgress size={24} /> : yesText}
          </Button>
        </Grid>
      </Grid>
    </Wrapper>
  );
}

export { ConfirmationDialog };
