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
  ModalButton,
} from 'components';
import { useDistributionEventsQuery } from 'generated/gql/pool';
import { useSubgraphPagination } from 'utils/react';

import { DistributionClaimsByEvent } from './DistributionClaimsByEvent';

export function DistributionEvents() {
  const { t, tKeys: tKeysAll } = useTranslate();
  const tKeys = tKeysAll.features.distributions.eventsList;

  const { result, paginationView } = useSubgraphPagination(useDistributionEventsQuery, {});
  const list = result.data?.distributionEvents || [];

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
                  <Table.Head>{t(tKeys.distribution.getKey())}</Table.Head>
                  <Table.Cell>
                    {({ data }) => <FormattedBalance sum={data.amount} token="ptk" />}
                  </Table.Cell>
                </Table.Column>
                <Table.Column>
                  <Table.Head>{t(tKeys.claimed.getKey())}</Table.Head>
                  <Table.Cell>
                    {({ data }) => <FormattedBalance sum={data.claimed} token="ptk" />}
                  </Table.Cell>
                </Table.Column>
                <Table.Column>
                  <Table.Head>{t(tKeys.members.getKey())}</Table.Head>
                  <Table.Cell>{({ data }) => data.poolState.usersLength}</Table.Cell>
                </Table.Column>
                <Table.Column>
                  <Table.Cell align="center">
                    {({ data }) => (
                      <ModalButton
                        variant="contained"
                        color="primary"
                        modalType="dialog"
                        content={t(tKeys.showClaimsButton.getKey())}
                      >
                        <DistributionClaimsByEvent eventId={data.id} />
                      </ModalButton>
                    )}
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
