import { ApolloClient } from 'apollo-client';
import { InMemoryCache, NormalizedCacheObject } from 'apollo-cache-inmemory';
import { ApolloLink, split } from 'apollo-link';
import { WebSocketLink } from 'apollo-link-ws';
import { HttpLink } from 'apollo-link-http';
import { onError } from 'apollo-link-error';
import { getMainDefinition } from 'apollo-utilities';

import { SUBGRAPH_HTTP_URL, SUBGRAPH_WS_URL } from 'env';

const poolLink = makeEndpointLink(
  new HttpLink({
    uri: SUBGRAPH_HTTP_URL,
    credentials: 'same-origin',
  }),
  new WebSocketLink({
    uri: SUBGRAPH_WS_URL,
    options: {
      reconnect: true,
    },
  }),
);

const allowedDirectives = ['pool'] as const;
type DirectiveName = typeof allowedDirectives[number];

const linkByDirective: Record<DirectiveName | 'default', ApolloLink> = {
  pool: poolLink,
  default: poolLink,
};

export const apolloLink = new ApolloLink(operation => {
  const { query } = operation;

  const definition = getMainDefinition(query);

  const foundedDirective =
    'operation' in definition &&
    definition.directives &&
    definition.directives.length &&
    definition.directives.find(item =>
      allowedDirectives.includes(item.name.value as DirectiveName),
    );

  if (!foundedDirective && definition.directives?.length) {
    console.error('Directive is not found in allowedDirectives', {
      definitionDerictives: definition.directives,
    });
  }

  const directive: DirectiveName | 'default' = foundedDirective
    ? (foundedDirective.name.value as DirectiveName)
    : 'default';

  return linkByDirective[directive].request(operation);
});

export function createApolloClient(link: ApolloLink): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    link: ApolloLink.from([
      onError(({ graphQLErrors, networkError }) => {
        if (graphQLErrors) {
          graphQLErrors.map(({ message, locations, path }) =>
            console.error(
              `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
            ),
          );
        }
        if (networkError) {
          console.error(`[Network error]: ${networkError}`);
        }
      }),
      link,
    ]),
    cache: new InMemoryCache(),
  });
}

function makeEndpointLink(httpLink: HttpLink, wsLink: WebSocketLink) {
  return split(
    ({ query }) => {
      const definition = getMainDefinition(query);

      return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
    },
    wsLink,
    httpLink,
  );
}

export const defaultApolloClient = createApolloClient(apolloLink);
