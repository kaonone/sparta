import build from 'build-route-tree';

const rawTree = {
  demo: null,
  account: null,
  balance: null,
  pool: null,
  stats: null,
  proposals: null,
  distributions: null,
  arbitrage: null,
};

export const routes = build(rawTree);
