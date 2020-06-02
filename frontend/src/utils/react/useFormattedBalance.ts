import BN from 'bn.js';
import { of } from 'rxjs';

import { useApi } from 'services/api';
import { Token, ITokenInfo } from 'model/types';
import { formatBalance } from 'utils/format';

import { useSubscribable, ISubscriptionMeta } from './useSubscribable';

type FormattedBalance = {
  formattedBalance: string;
  notRoundedBalance: string;
  tokenInfo: ITokenInfo;
};

export function useFormattedBalance({
  token,
  tokenAddress,
  value,
  precision = 2,
  variant = 'long',
}: {
  token?: Token;
  tokenAddress?: string;
  value: string | BN;
  precision?: number;
  variant?: 'short' | 'long';
}): [FormattedBalance, ISubscriptionMeta] {
  if (!token && !tokenAddress) {
    console.warn('You need to use either "token" or "tokenAddress"');
  }

  const api = useApi();
  const [tokenInfo, tokenInfoMeta] = useSubscribable(
    () =>
      (tokenAddress && api.tokens.getErc20TokenInfo$(tokenAddress)) ||
      (token && api.tokens.getTokenInfo$(token)) ||
      of(null),
    [token],
  );

  return [
    (tokenInfo && {
      formattedBalance: getFormattedBalance(value.toString(), tokenInfo, precision, variant),
      notRoundedBalance: getFormattedBalance(
        value.toString(),
        tokenInfo,
        tokenInfo.decimals,
        variant,
      ),
      tokenInfo,
    }) || {
      formattedBalance: '⏳',
      notRoundedBalance: '⏳',
      tokenInfo: {
        decimals: 0,
        symbol: '⏳',
      },
    },
    tokenInfoMeta,
  ];
}

const getFormattedBalance = (
  value: string | BN,
  tokenInfo: ITokenInfo,
  precision: number,
  variant: 'short' | 'long',
) =>
  formatBalance({
    amountInBaseUnits: value,
    baseDecimals: tokenInfo.decimals,
    tokenSymbol: tokenInfo.symbol,
    precision: precision || 2,
    variant,
  });
