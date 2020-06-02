import React from 'react';
import Button from '@material-ui/core/Button';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { BuyCashIcon } from 'components/icons';
import { ModalButton } from 'components/ModalButton/ModalButton';

import { PTokenBuyingForm } from './PTokenBuyingForm';

type IButtonProps = React.ComponentPropsWithoutRef<typeof Button>;

const tKeys = tKeysAll.features.cashExchange.pTokenBuying;

export function PTokenBuyingButton(props: IButtonProps) {
  const { t } = useTranslate();

  return (
    <ModalButton
      startIcon={<BuyCashIcon />}
      content={t(tKeys.buttonTitle.getKey())}
      fullWidth
      {...props}
    >
      {({ closeModal }) => <PTokenBuyingForm onCancel={closeModal} />}
    </ModalButton>
  );
}
