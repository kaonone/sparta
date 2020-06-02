import React, { useCallback, useState } from 'react';
import { of } from 'rxjs';

import { useApi } from 'services/api';
import { useSubscribable, useOnChangeState } from 'utils/react';
import { Dialog, DialogContent } from 'components';
import { makeStyles } from 'utils/styles';

import { PTokenBuyingForm } from './PTokenBuyingForm';

export function JoiningToPoolModal() {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const classes = useStyles();

  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, [api]);

  const [balance] = useSubscribable(
    () => (account ? api.tokens.getBalance$('ptk', account) : of(null)),
    [api, account],
    null,
  );

  useOnChangeState(balance, (prev, cur) => !prev && !!cur && cur.isZero(), open);

  return (
    <Dialog fullWidth maxWidth="sm" open={isOpen} onClose={close}>
      <DialogContent className={classes.dialogContent}>
        <PTokenBuyingForm onCancel={close} />
      </DialogContent>
    </Dialog>
  );
}

const useStyles = makeStyles(theme => ({
  dialogContent: {
    padding: theme.spacing(2.5),
  },
}));
