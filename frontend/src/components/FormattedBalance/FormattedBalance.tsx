import React, { FunctionComponent } from 'react';
import BN from 'bn.js';
import Tooltip from '@material-ui/core/Tooltip/Tooltip';

import { useFormattedBalance } from 'utils/react';
import { Loading } from 'components/Loading';
import { Token, ITokenInfo } from 'model/types';

interface IProps {
  sum: BN | string;
  token?: Token;
  tokenAddress?: string;
  className?: string;
  children?: FunctionComponent<{
    formattedBalance: string;
    notRoundedBalance: string;
    tokenInfo: ITokenInfo;
  }>;
}

function FormattedBalance(props: IProps) {
  const { sum, token, tokenAddress, children, className } = props;
  const [
    { formattedBalance, notRoundedBalance, tokenInfo },
    formattedBalanceMeta,
  ] = useFormattedBalance({
    token,
    tokenAddress,
    value: sum,
  });

  return (
    <Loading
      meta={formattedBalanceMeta}
      progressVariant="circle"
      progressProps={{ size: '0.8em', color: 'inherit' }}
    >
      <Tooltip title={notRoundedBalance}>
        <span className={className}>
          {children
            ? children({ formattedBalance, notRoundedBalance, tokenInfo })
            : formattedBalance}
        </span>
      </Tooltip>
    </Loading>
  );
}

export { FormattedBalance };
