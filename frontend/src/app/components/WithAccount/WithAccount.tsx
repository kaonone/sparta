import React from 'react';

import { useTranslate } from 'services/i18n';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { Loading, Hint } from 'components';

interface Props {
  children: ((props: { account: string }) => React.ReactNode) | React.ReactNode;
}

export function WithAccount({ children }: Props) {
  const { t, tKeys } = useTranslate();

  const api = useApi();
  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);

  return (
    <Loading meta={accountMeta}>
      {account && (typeof children === 'function' ? children({ account }) : children)}
      {!account && <Hint>{t(tKeys.app.connectingWarning.getKey())}</Hint>}
    </Loading>
  );
}
