import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { ConfirmationDialog } from 'components';

type IProps = React.ComponentPropsWithoutRef<typeof Button> & {
  account: string;
};

const tKeysConfirmation = tKeysAll.features.cashExchange.exchangingConfirmation;
const tKeys = tKeysAll.features.createArbitrageExecutor;

function CreateArbitrageExecutorButton(props: IProps) {
  const { account, ...restProps } = props;
  const { t } = useTranslate();
  const api = useApi();

  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const handleActivate = useCallback(async (): Promise<void> => {
    await api.arbitrageModule.createExecutor(account);
    close();
  }, [account]);

  return (
    <>
      <Button {...restProps} onClick={open} />
      <ConfirmationDialog
        isOpen={isOpen}
        message={t(tKeys.confirmMessage.getKey())}
        noText={t(tKeysConfirmation.no.getKey())}
        yesText={t(tKeysConfirmation.yes.getKey())}
        title={t(tKeysConfirmation.title.getKey())}
        onCancel={close}
        onConfirm={handleActivate}
      />
    </>
  );
}

export { CreateArbitrageExecutorButton };
