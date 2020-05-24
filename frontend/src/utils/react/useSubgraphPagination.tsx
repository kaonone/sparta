import React, { useState, useCallback, useEffect } from 'react';
import * as ApolloReactHooks from '@apollo/react-hooks';
import * as ApolloReactCommon from '@apollo/react-common';

import { Pagination } from 'components/Pagination/Pagination';

const steps = [10, 25, 50, 100];

interface PaginationVariables {
  first: number;
  skip: number;
}

export function useSubgraphPagination<
  V extends PaginationVariables,
  D extends {},
  R extends ApolloReactCommon.QueryResult<D, V>
>(
  useQuery: (baseOptions?: ApolloReactHooks.QueryHookOptions<D, V>) => R,
  variables: Omit<V, keyof PaginationVariables>,
) {
  const defaultPerPage = steps[0];
  const poolInterval = 2000;

  const [currentPage, setPage] = useState(0);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRefetchTrigger(Math.random()), poolInterval);
    return () => clearInterval(interval);
  }, []);

  const result = useQuery({
    variables: { first: defaultPerPage, skip: 0, ...variables } as V,
  });

  useEffect(() => {
    result.fetchMore({
      variables: {
        first: perPage,
        skip: currentPage * perPage,
        ...variables,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        return fetchMoreResult || prev;
      },
    });
  }, [result.fetchMore, currentPage, perPage, refetchTrigger]);

  const from = currentPage * perPage;

  const checkNextPage = useQuery({
    variables: { first: perPage, skip: from + perPage, ...variables } as V,
    fetchPolicy: 'no-cache',
  });

  const nextPageLength: number =
    !checkNextPage.loading && checkNextPage.data ? getLengthOfArrayProps(checkNextPage.data) : 0;
  const total = (currentPage + 1) * perPage + nextPageLength;

  const changePerPage = useCallback(
    itemPerPage => {
      setPage(Math.floor(from / itemPerPage));
      setPerPage(itemPerPage);
    },
    [from],
  );

  const paginationView = (
    <Pagination
      totalItems={total}
      perPage={perPage}
      currentPage={currentPage}
      onChangePerPage={changePerPage}
      onChangePage={setPage}
      paginationSteps={steps}
      nextStepLoading={checkNextPage.loading}
    />
  );
  return { result, paginationView };
}

function getLengthOfArrayProps<D extends Record<string, any[]>>(data: D) {
  return (Object.values(data).find((value: any) => Array.isArray(value)) || []).length;
}
