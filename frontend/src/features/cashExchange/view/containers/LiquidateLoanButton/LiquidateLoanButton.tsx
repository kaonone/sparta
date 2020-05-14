import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { ConfirmationDialog, Loading } from 'components';
import { useSubscribable } from 'utils/react';

type IProps = React.ComponentPropsWithoutRef<typeof Button> & {
  debtId: string;
  borrower: string;
};

const tKeysConfirmation = tKeysAll.features.cashExchange.exchangingConfirmation;
const tKeys = tKeysAll.features.cashExchange.liquidateLoanButton;

function LiquidateLoanButton(props: IProps) {
  const { borrower, debtId, ...restProps } = props;
  const { t } = useTranslate();
  const api = useApi();

  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);

  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const handleActivate = useCallback(async (): Promise<void> => {
    account && (await api.loanModule.liquidateDebt(account, borrower, debtId));
    close();
  }, [account, borrower, debtId]);

  return (
    <>
      <Loading meta={accountMeta}>{account && <Button {...restProps} onClick={open} />}</Loading>
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

export { LiquidateLoanButton };
