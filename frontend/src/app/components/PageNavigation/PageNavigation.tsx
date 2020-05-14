import * as React from 'react';
import { useRouteMatch } from 'react-router';
import { Link } from 'react-router-dom';
import cn from 'classnames';

import { routes } from 'app/routes';
import { Tabs, Tab } from 'components';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';

import { useStyles } from './PageNavigation.style';

const additionalRoutes = new Map([
  [
    routes.proposals.getElementKey(),
    {
      route: routes.proposals,
      label: 'Lending',
    },
  ],
]);

function PageNavigation() {
  const classes = useStyles();
  const match = useRouteMatch<{ page: string }>('/:page');

  const [additionalPage, setAdditionalPage] = React.useState<string | null>();
  const additionalRoute = additionalPage && additionalRoutes.get(additionalPage);

  const api = useApi();
  const [account] = useSubscribable(() => api.web3Manager.account, []);

  const page = match && match.params.page;

  React.useEffect(() => {
    page && additionalRoutes.has(page) && setAdditionalPage(page);
  }, [page]);

  return (
    <Tabs
      value={page}
      indicatorColor="primary"
      textColor="primary"
      classes={{ flexContainer: classes.tabsFlexContainer }}
    >
      {account && (
        <Tab
          className={classes.tab}
          label="Account"
          component={Link}
          value={routes.account.getElementKey()}
          to={routes.account.getRedirectPath()}
        />
      )}
      <Tab
        className={classes.tab}
        label="Pool"
        component={Link}
        value={routes.pool.getElementKey()}
        to={routes.pool.getRedirectPath()}
      />
      <Tab
        className={classes.tab}
        label="Stats"
        component={Link}
        value={routes.stats.getElementKey()}
        to={routes.stats.getRedirectPath()}
      />
      <Tab
        className={classes.tab}
        label="Distributions"
        component={Link}
        value={routes.distributions.getElementKey()}
        to={routes.distributions.getRedirectPath()}
      />
      {additionalRoute && (
        <Tab
          className={cn(classes.tab, classes.additionalTab)}
          label={additionalRoute.label}
          component={Link}
          value={additionalRoute.route.getElementKey()}
          to={additionalRoute.route.getRedirectPath()}
        />
      )}
    </Tabs>
  );
}

export { PageNavigation };
