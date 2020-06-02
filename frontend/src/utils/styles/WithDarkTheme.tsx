import React from 'react';
import { MuiThemeProvider } from '@material-ui/core/styles';

import { darkTheme } from './theme';

export function WithDarkTheme({ children }: { children: React.ReactNode }) {
  return <MuiThemeProvider theme={darkTheme}>{children}</MuiThemeProvider>;
}
