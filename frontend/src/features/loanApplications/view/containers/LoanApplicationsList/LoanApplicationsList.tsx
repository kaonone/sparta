import * as React from 'react';

import { Grid, Hint, Typography, Box, Loading } from 'components';
import { useDebtProposalsQuery, Status } from 'generated/gql/pool';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useSubgraphPagination } from 'utils/react';

import { LoanApplicationCard } from '../../components/LoanApplicationCard/LoanApplicationCard';

const tKeys = tKeysAll.features.loanApplications;

interface Activity {
  lendValue: string;
  borrower: string;
  aprValue: string;
  stakedValue: string;
  descriptionHash: string;
  status: Status;
  proposalId: string;
}

function LoanApplicationsList() {
  const { t } = useTranslate();

  const { result, paginationView } = useSubgraphPagination(useDebtProposalsQuery, {});
  const debts = result.data?.debts;

  const activities: Activity[] = React.useMemo(
    () =>
      debts?.map<Activity>(debt => ({
        lendValue: debt.total,
        borrower: debt.borrower.id,
        aprValue: debt.apr,
        stakedValue: debt.lStaked,
        descriptionHash: debt.description,
        status: debt.status,
        proposalId: debt.proposal_id,
      })) || [],
    [debts],
  );

  return (
    <Loading gqlResults={result}>
      {!activities.length ? (
        <Hint>
          <Typography>{t(tKeys.notFound.getKey())}</Typography>
        </Hint>
      ) : (
        <>
          <Grid container spacing={3}>
            {activities.map((activity, index) => (
              <Grid key={index} item xs={12}>
                <LoanApplicationCard {...activity} />
              </Grid>
            ))}
          </Grid>
          <Box my={3}>{paginationView}</Box>
        </>
      )}
    </Loading>
  );
}

export { LoanApplicationsList };
