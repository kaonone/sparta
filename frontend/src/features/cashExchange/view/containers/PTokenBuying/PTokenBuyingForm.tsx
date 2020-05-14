import React, { useCallback } from 'react';
import { map } from 'rxjs/operators';

import { useApi } from 'services/api';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';

import { PTokenExchanging } from '../../components/PTokenExcahnging/PTokenExcahnging';

const tKeys = tKeysAll.features.cashExchange.pTokenBuying;

interface IFormProps {
  onCancel: () => void;
}

export function PTokenBuyingForm({ onCancel }: IFormProps) {
  const { t } = useTranslate();
  const api = useApi();

  const getMaxSourceValue = useCallback(
    (account: string) => api.tokens.getBalance$('dai', account),
    [],
  );
  const getMinSourceValue = useCallback(
    () => api.liquidityModule.getConfig$().pipe(map(({ lDepositMin }) => lDepositMin)),
    [],
  );

  return (
    <PTokenExchanging
      title={t(tKeys.formTitle.getKey())}
      sourcePlaceholder={t(tKeys.placeholder.getKey())}
      getMaxSourceValue={getMaxSourceValue}
      getMinSourceValue={getMinSourceValue}
      confirmMessageTKey={tKeys.confirmMessage.getKey()}
      onExchangeRequest={api.liquidityModule.buyPtk}
      onCancel={onCancel}
    />
  );
}
