import React from 'react';

import { useSubgraphPagination } from 'utils/react';
import { useMyBalanceChangesQuery } from 'generated/gql/pool';
import { Loading } from 'components';

import { BalanceChangesList } from '../components/BalanceChangesList';

interface IProps {
  account: string;
}

function BalanceChanges(props: IProps) {
  const { account } = props;

  const { result, paginationView } = useSubgraphPagination(useMyBalanceChangesQuery, {
    address: account.toLowerCase(),
  });

  const balanceChanges = result.data?.balanceChanges || [];

  return (
    <Loading gqlResults={result} progressVariant="circle">
      <BalanceChangesList list={balanceChanges} paginationView={paginationView} />
    </Loading>
  );
}

export { BalanceChanges };
