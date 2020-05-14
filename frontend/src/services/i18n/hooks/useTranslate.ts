import { useContext } from 'react';

import { TContext } from '../constants';

export function useTranslate() {
  return useContext(TContext);
}
