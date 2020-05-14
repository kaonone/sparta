import MuiThemeProvider from '@material-ui/styles/ThemeProvider';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { App } from 'app/App';
import { Api, ApiContext } from 'services/api';
import { ApolloProvider } from 'services/apollo';
import { I18nProvider } from 'services/i18n';
import { TransactionsNotifications } from 'features/transactionsNotifications';
import { CookiesMsg } from 'features/cookies';
import { NetworkWarning } from 'features/networkWarning';
import { ErrorBoundary, Snackbar, CssBaseline } from 'components';
import { theme } from 'utils/styles';
import { JoiningToPoolModal } from 'features/cashExchange';

export function Root(): React.ReactElement<{}> {
  const api = new Api();

  if (process.env.NODE_ENV === 'development') {
    (window as any).api = api;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ApiContext.Provider value={api}>
          <Snackbar>
            <I18nProvider>
              <MuiThemeProvider theme={theme}>
                <ApolloProvider>
                  <CssBaseline />
                  <App />
                  <TransactionsNotifications />
                  <CookiesMsg />
                  <NetworkWarning />
                  <JoiningToPoolModal />
                </ApolloProvider>
              </MuiThemeProvider>
            </I18nProvider>
          </Snackbar>
        </ApiContext.Provider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
