import React from 'react';
import Grid from '@material-ui/core/Grid';
import Avatar from '@material-ui/core/Avatar';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import BN from 'bn.js';

import { ShortAddress, Loading, FormattedBalance } from 'components';
import { getPledgeId } from 'model/getPledgeId';
import { usePledgeSubscription, Status } from 'generated/gql/pool';
import { useSubscribable } from 'utils/react';
import { useApi } from 'services/api';
import { useTranslate } from 'services/i18n';

export function AddressCell({ address }: { address: string }) {
  return (
    <Grid container alignItems="center" spacing={1}>
      <Grid item>
        <Avatar>
          <Jazzicon diameter={40} seed={jsNumberForAddress(address)} />
        </Avatar>
      </Grid>
      <Grid item>
        <ShortAddress address={address} />
      </Grid>
    </Grid>
  );
}

interface MyEarnCellProps {
  supporter: string;
  borrower: string;
  proposalId: string;
}

export function MyEarnCell({ supporter, borrower, proposalId }: MyEarnCellProps) {
  const pledgeHash = React.useMemo(() => getPledgeId(supporter, borrower, proposalId), [
    supporter,
    borrower,
    proposalId,
  ]);

  const api = useApi();

  const pledgeGqlResult = usePledgeSubscription({ variables: { pledgeHash } });
  const pInterest = pledgeGqlResult.data?.pledge?.pInterest || '0';

  const [interestCost, interestCostMeta] = useSubscribable(
    () => api.fundsModule.getAvailableBalanceIncreasing$(supporter, pInterest, '0'),
    [supporter, pInterest],
    new BN(0),
  );

  return (
    <Loading gqlResults={pledgeGqlResult} meta={interestCostMeta}>
      {interestCost.gtn(0) ? <FormattedBalance sum={interestCost} token="dai" /> : '—'}
    </Loading>
  );
}

interface StatusProps {
  status: Status;
  pledgeProgress: number;
}

export function StatusCell({ status, pledgeProgress }: StatusProps) {
  const { t, tKeys } = useTranslate();

  return (
    <>
      {t(tKeys.features.loans.loansPanel.statuses[status].getKey(), {
        pledgeProgress,
      })}
    </>
  );
}
