import React from 'react';

import { useSubgraphPagination } from 'utils/react';
import { useMyEarningsQuery } from 'generated/gql/pool';
import { Loading } from 'components';

import { EarningsList } from '../components/EarningsList';

interface IProps {
  account: string;
}

function Earnings(props: IProps) {
  const { account } = props;

  const { result, paginationView } = useSubgraphPagination(useMyEarningsQuery, {
    address: account.toLowerCase(),
  });

  const balanceChanges = result.data?.earnings || [];

  return (
    <Loading gqlResults={result} progressVariant="circle">
      <EarningsList list={balanceChanges} paginationView={paginationView} />
    </Loading>
  );
}

export { Earnings };
