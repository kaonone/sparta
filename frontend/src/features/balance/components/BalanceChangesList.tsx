import React from 'react';
import BN from 'bn.js';

import {
  Typography,
  Hint,
  Grid,
  Table as GeneralTable,
  MakeTableType,
  FormattedBalance,
} from 'components';
import { BalanceChange } from 'generated/gql/pool';
import { useTranslate } from 'services/i18n';

type PartialBalanceChange = Pick<BalanceChange, 'date' | 'type' | 'amount'>;

export const Table = GeneralTable as MakeTableType<PartialBalanceChange>;

interface Props {
  list: PartialBalanceChange[];
  paginationView: React.ReactNode;
}

export function BalanceChangesList({ list, paginationView }: Props) {
  const { t, tKeys: tKeysAll } = useTranslate();
  const tKeys = tKeysAll.features.balance.changes;

  return (
    <>
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
                  <Table.Head>{t(tKeys.type.getKey())}</Table.Head>
                  <Table.Cell>{({ data }) => t(tKeys.types[data.type].getKey())}</Table.Cell>
                </Table.Column>
                <Table.Column>
                  <Table.Head>{t(tKeys.amount.getKey())}</Table.Head>
                  <Table.Cell>
                    {({ data }) => <FormattedBalance sum={data.amount} token="dai" />}
                  </Table.Cell>
                </Table.Column>
              </Table>
            </Grid>
            {paginationView && (
              <Grid item xs={12}>
                {paginationView}
              </Grid>
            )}
          </Grid>
        </>
      )}
    </>
  );
}
