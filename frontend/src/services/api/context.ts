import React, { useContext } from 'react';

import { Api } from './Api';

export const ApiContext = React.createContext<Api | null>(null);

export function useApi(): Api {
  const api = useContext(ApiContext);
  if (!api) {
    throw new Error('Api React Context is not defined');
  }
  return api;
}
