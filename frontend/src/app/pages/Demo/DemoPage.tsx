import * as React from 'react';

import { AuthButton } from 'features/auth';
import { Typography, Loading } from 'components';
import { useSubgraphPagination } from 'utils/react';
import { useUsersQuery } from 'generated/gql/pool';

export function DemoPage() {
  const { result, paginationView } = useSubgraphPagination(useUsersQuery, {});

  return (
    <div>
      <AuthButton />
      <Typography variant="h4" gutterBottom>
        Page for developers
      </Typography>
      <Loading gqlResults={result}>
        {result.data && <pre>{JSON.stringify(result.data.users, null, 2)}</pre>}
      </Loading>
      {paginationView}
    </div>
  );
}
