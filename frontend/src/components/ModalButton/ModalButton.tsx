import * as React from 'react';
import { GetProps } from '_helpers';
import Dialog, { DialogProps } from '@material-ui/core/Dialog';
import Drawer from '@material-ui/core/Drawer';
import Button from '@material-ui/core/Button';
import DialogContent from '@material-ui/core/DialogContent';

import { makeStyles, WithDarkTheme } from 'utils/styles';

interface IChildrenProps {
  closeModal(): void;
}

type ButtonProps = Pick<
  GetProps<typeof Button>,
  'variant' | 'color' | 'disabled' | 'fullWidth' | 'size' | 'startIcon'
>;

interface IProps extends ButtonProps {
  modalType?: 'drawer' | 'dialog';
  dialogMaxWidth?: DialogProps['maxWidth'];
  content: React.ReactNode;
  children: React.ReactNode | ((props: IChildrenProps) => React.ReactNode);
}

function ModalButton(props: IProps) {
  const classes = useStyles();
  const { children, content, dialogMaxWidth, modalType = 'drawer', ...rest } = props;
  const [isOpened, setIsOpened] = React.useState(false);

  const openModal = React.useCallback(() => setIsOpened(true), []);
  const closeModal = React.useCallback(() => setIsOpened(false), []);

  return (
    <>
      <Button {...rest} onClick={openModal}>
        {content}
      </Button>
      {modalType === 'dialog' && (
        <Dialog fullWidth maxWidth={dialogMaxWidth || 'sm'} open={isOpened} onClose={closeModal}>
          <DialogContent className={classes.dialogContent}>
            {typeof children === 'function' ? children({ closeModal }) : children}
          </DialogContent>
        </Dialog>
      )}
      {modalType === 'drawer' && (
        <WithDarkTheme>
          <Drawer open={isOpened} anchor="right" onClose={closeModal}>
            {typeof children === 'function' ? children({ closeModal }) : children}
          </Drawer>
        </WithDarkTheme>
      )}
    </>
  );
}

const useStyles = makeStyles(theme => ({
  dialogContent: {
    padding: theme.spacing(2.5),
  },
}));

export { ModalButton };
