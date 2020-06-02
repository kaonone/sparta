import React from 'react';

import { useSubgraphPagination } from 'utils/react';
import { Loading } from 'components';
import { useMyLoansQuery } from 'generated/gql/pool';

import { LoansTable } from '../components/LoansTable';

interface IProps {
  account: string;
}

function MyLoans(props: IProps) {
  const { account } = props;

  const { result, paginationView } = useSubgraphPagination(useMyLoansQuery, {
    address: account.toLowerCase(),
  });

  const loans = result.data?.debts || [];

  return (
    <Loading gqlResults={result} progressVariant="circle">
      <LoansTable list={loans} paginationView={paginationView} hideColumns={['address', 'earn']} />
    </Loading>
  );
}

export { MyLoans };
