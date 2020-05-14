import React from 'react';
import BN from 'bn.js';

import { useTranslate } from 'services/i18n';
import {
  Typography,
  Hint,
  Grid,
  Loading,
  Table as GeneralTable,
  MakeTableType,
  FormattedBalance,
  ShortAddress,
} from 'components';
import { useDistributionClaimsByEventQuery } from 'generated/gql/pool';
import { useSubgraphPagination } from 'utils/react';

interface Props {
  eventId: string;
}

export function DistributionClaimsByEvent({ eventId }: Props) {
  const { t, tKeys: tKeysAll } = useTranslate();
  const tKeys = tKeysAll.features.distributions.claimsList;

  const { result, paginationView } = useSubgraphPagination(useDistributionClaimsByEventQuery, {
    eventId,
  });
  const list = result.data?.earnings || [];

  const Table = GeneralTable as MakeTableType<typeof list[0]>;

  return (
    <Loading gqlResults={result}>
      {!list.length ? (
        <Hint>
          <Typography>{t(tKeys.notFound.getKey())}</Typography>
        </Hint>
      ) : (
        <>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Table data={list}>
                <Table.Column>
                  <Table.Head align="center">{t(tKeys.date.getKey())}</Table.Head>
                  <Table.Cell align="center">
                    {({ data }) => new Date(new BN(data.date).toNumber() * 1000).toLocaleString()}
                  </Table.Cell>
                </Table.Column>
                <Table.Column>
                  <Table.Head>{t(tKeys.address.getKey())}</Table.Head>
                  <Table.Cell>{({ data }) => <ShortAddress address={data.user.id} />}</Table.Cell>
                </Table.Column>
                <Table.Column>
                  <Table.Head>{t(tKeys.claimed.getKey())}</Table.Head>
                  <Table.Cell>
                    {({ data }) => <FormattedBalance sum={data.pAmount} token="ptk" />}
                  </Table.Cell>
                </Table.Column>
              </Table>
            </Grid>
            <Grid item xs={12}>
              {paginationView}
            </Grid>
          </Grid>
        </>
      )}
    </Loading>
  );
}
