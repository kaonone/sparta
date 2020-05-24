import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { ConfirmationDialog } from 'components';

type IProps = React.ComponentPropsWithoutRef<typeof Button> & {
  account: string;
  executor: string;
  tokens: string[];
};

const tKeysConfirmation = tKeysAll.features.cashExchange.exchangingConfirmation;

export function ApproveSwapTokensButton(props: IProps) {
  const { account, executor, tokens, ...restProps } = props;
  const { t } = useTranslate();
  const api = useApi();

  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const handleActivate = useCallback(async (): Promise<void> => {
    await api.arbitrageModule.approveTokens(account, executor, tokens);
    close();
  }, [account]);

  return (
    <>
      <Button {...restProps} onClick={open} />
      <ConfirmationDialog
        isOpen={isOpen}
        message="Are you sure you want to approve tokens?"
        noText={t(tKeysConfirmation.no.getKey())}
        yesText={t(tKeysConfirmation.yes.getKey())}
        title={t(tKeysConfirmation.title.getKey())}
        onCancel={close}
        onConfirm={handleActivate}
      />
    </>
  );
}
