import React from 'react';
import { Observable } from 'rxjs';

import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { ConfirmationDialog } from 'components';
import { useFormattedBalance, useSubscribable } from 'utils/react';

interface IProps<T> {
  isOpen: boolean;
  values: T | null;
  messageTKey: string | ((values: T | null) => Observable<string>);
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function PTokenExchangingConfirmation<ExtraFormData extends Record<string, any> = {}>(
  props: IProps<ExtraFormData>,
) {
  const { messageTKey, onCancel, onConfirm, values, isOpen } = props;

  const { t } = useTranslate();
  const tKeys = tKeysAll.features.cashExchange.exchangingConfirmation;

  const [{ formattedBalance: formattedSourceAmount }] = useFormattedBalance({
    token: 'dai',
    value: values?.sourceAmount || '0',
  });

  const message =
    typeof messageTKey === 'string'
      ? t(messageTKey, { sourceAmount: formattedSourceAmount })
      : useSubscribable(() => messageTKey(values), [values], '⏳');

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      message={message}
      noText={t(tKeys.no.getKey())}
      yesText={t(tKeys.yes.getKey())}
      title={t(tKeys.title.getKey())}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export { PTokenExchangingConfirmation };
