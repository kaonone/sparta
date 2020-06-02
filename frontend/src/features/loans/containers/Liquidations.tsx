import React from 'react';
import moment from 'moment';
import BN from 'bn.js';

import { useSubgraphPagination, useSubscribable } from 'utils/react';
import { useDebtsAvailableForLiquidationQuery } from 'generated/gql/pool';
import { Loading } from 'components';
import { useApi } from 'services/api';

import { LoansTable } from '../components/LoansTable';

export function Liquidations() {
  const api = useApi();
  const [config, configMeta] = useSubscribable(() => api.loanModule.getConfig$(), []);

  const duePaymentDate = moment()
    .subtract(config?.debtRepayDeadlinePeriod?.toNumber() || 0, 'seconds')
    .unix();

  const { result, paginationView } = useSubgraphPagination(useDebtsAvailableForLiquidationQuery, {
    liquidationDate: new BN(duePaymentDate).toString(),
  });
  const others = result.data?.debts || [];

  return (
    <Loading gqlResults={result} meta={configMeta} progressVariant="circle">
      <LoansTable list={others} paginationView={paginationView} />
    </Loading>
  );
}
