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
import { Earning } from 'generated/gql/pool';
import { useTranslate } from 'services/i18n';

type PartialEarning = Pick<Earning, 'date' | 'lAmount' | 'type'>;

export const Table = GeneralTable as MakeTableType<PartialEarning>;

interface Props {
  list: PartialEarning[];
  paginationView: React.ReactNode;
}

export function EarningsList({ list, paginationView }: Props) {
  const { t, tKeys: tKeysAll } = useTranslate();
  const tKeys = tKeysAll.features.balance.earnings;

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
                    {({ data }) => <FormattedBalance sum={data.lAmount} token="dai" />}
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
