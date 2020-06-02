import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { ConfirmationDialog, Loading } from 'components';
import { useSubscribable } from 'utils/react';
import { zeroAddress } from 'utils/mock';
import { formatBalance } from 'utils/format';

type IProps = React.ComponentPropsWithoutRef<typeof Button>;

const tKeysConfirmation = tKeysAll.features.cashExchange.exchangingConfirmation;
const tKeys = tKeysAll.features.cashExchange.preliminaryExitButton;

export function PreliminaryExitButton(props: IProps) {
  const { t } = useTranslate();
  const api = useApi();

  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);
  const [daiTokenInfo, daiTokenInfoMeta] = useSubscribable(() => api.tokens.getTokenInfo$('dai'), [
    api,
  ]);
  const [exitInfo, exitInfoMeta] = useSubscribable(
    () => api.liquidityModule.getPreliminaryExitInfo$(account || zeroAddress),
    [api, account],
  );

  const confirmMessage = t(tKeys.confirmMessage.getKey(), {
    exitBalance:
      (exitInfo &&
        daiTokenInfo &&
        formatBalance({
          amountInBaseUnits: exitInfo.exitBalance,
          baseDecimals: daiTokenInfo.decimals,
          tokenSymbol: daiTokenInfo.symbol,
        })) ||
      '⏳',
    exitLose:
      (exitInfo &&
        daiTokenInfo &&
        formatBalance({
          amountInBaseUnits: exitInfo.exitLose,
          baseDecimals: daiTokenInfo.decimals,
          tokenSymbol: daiTokenInfo.symbol,
        })) ||
      '⏳',
  });

  const handleConfirm = useCallback(async (): Promise<void> => {
    account && (await api.liquidityModule.closePlan(account));
    close();
  }, [account]);

  return (
    <>
      <Loading meta={[daiTokenInfoMeta, accountMeta, exitInfoMeta]}>
        <Button {...props} onClick={open} disabled={!exitInfo || exitInfo.exitBalance.isZero()}>
          {t(tKeys.button.getKey())}
        </Button>
      </Loading>
      <ConfirmationDialog
        isOpen={isOpen}
        message={confirmMessage}
        noText={t(tKeysConfirmation.no.getKey())}
        yesText={t(tKeysConfirmation.yes.getKey())}
        title={t(tKeysConfirmation.title.getKey())}
        onCancel={close}
        onConfirm={handleConfirm}
      />
    </>
  );
}
