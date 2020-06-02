import React, { useState } from 'react';
import { ApolloProvider as ApolloHooksProvider } from '@apollo/react-hooks';
import {
  introspectSchema,
  makeRemoteExecutableSchema,
  addMockFunctionsToSchema,
  MockList,
} from 'graphql-tools';
import { SchemaLink } from 'apollo-link-schema';
import ApolloClient from 'apollo-client';

import { getEnv } from 'core/getEnv';

import { defaultApolloClient, apolloLink, createApolloClient } from './apolloClient';

interface Props {
  children: React.ReactNode;
}

async function createMockApolloClient() {
  const schema = await introspectSchema(apolloLink);
  const executableSchema = makeRemoteExecutableSchema({ schema });

  const mocks = {
    Query: () => ({
      balances: () =>
        new MockList(10, () => ({
          lBalance: () => '12345',
        })),
      debts: () =>
        new MockList(10, () => ({
          last_update: () => new Date(),
        })),
    }),
    BigInt: () => '123456',
    Bytes: () => '0x0000000000000000000000000000000000000000000000000000000000000000',
    // TODO doesn't work
    Subscription: () => ({
      users: () => new MockList(10),
      pools: () =>
        new MockList(10, () => ({
          lBalance: () => '1192000000000000000000',
          lDebt: () => '1000000000000000000000',
        })),
    }),
  };

  addMockFunctionsToSchema({
    schema: executableSchema,
    mocks,
  });

  const mockLink = new SchemaLink({ schema: executableSchema });
  return createApolloClient(mockLink);
}

export function ApolloProvider({ children }: Props) {
  const { isMockServer } = getEnv();
  const [apolloClient, setApolloClient] = useState<ApolloClient<any> | null>(() =>
    isMockServer ? null : defaultApolloClient,
  );

  React.useEffect(() => {
    isMockServer && createMockApolloClient().then(setApolloClient);
  }, []);

  if (apolloClient) {
    return <ApolloHooksProvider client={apolloClient}>{children}</ApolloHooksProvider>;
  }
  return <>Mock server is loading...</>;
}
