import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';
import { switchMap } from 'rxjs/operators';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { SellCashIcon } from 'components/icons';
import { ModalButton } from 'components/ModalButton/ModalButton';

import { PTokenExchanging } from '../../components/PTokenExcahnging/PTokenExcahnging';

type IProps = React.ComponentPropsWithoutRef<typeof Button>;

const tKeys = tKeysAll.features.cashExchange.pTokenSellingButton;

function PTokenSellingButton(props: IProps) {
  const { t } = useTranslate();
  const api = useApi();

  const getMaxSourceValue = useCallback(
    (account: string) => api.fundsModule.getMaxWithdrawAmountInDai$(account),
    [],
  );
  const getMinSourceValue = useCallback(
    () =>
      api.liquidityModule
        .getConfig$()
        .pipe(
          switchMap(({ pWithdrawMin }) =>
            api.fundsModule.getUserWithdrawAmountInDai$(pWithdrawMin.toString()),
          ),
        ),
    [],
  );

  return (
    <ModalButton
      startIcon={<SellCashIcon />}
      content={t(tKeys.buttonTitle.getKey())}
      fullWidth
      {...props}
    >
      {({ closeModal }) => (
        <PTokenExchanging
          title={t(tKeys.formTitle.getKey())}
          sourcePlaceholder={t(tKeys.placeholder.getKey())}
          getMaxSourceValue={getMaxSourceValue}
          getMinSourceValue={getMinSourceValue}
          confirmMessageTKey={tKeys.confirmMessage.getKey()}
          onExchangeRequest={api.liquidityModule.sellPtk}
          onCancel={closeModal}
        />
      )}
    </ModalButton>
  );
}

export { PTokenSellingButton };
