import { createMuiTheme, Theme } from '@material-ui/core/styles';

import { colors } from 'utils/styles/colors';

import {
  robotoThin,
  robotoThinItalic,
  robotoLight,
  robotoLightItalic,
  robotoRegular,
  robotoItalic,
  robotoMedium,
  robotoMediumItalic,
  robotoBold,
  robotoBoldItalic,
  robotoBlack,
  robotoBlackItalic,
} from './fonts';
import { generateGridSpacingOverrides } from './generateGridSpacingOverrides';

export { Theme };

const defaultTheme = createMuiTheme();

export const theme: Theme = createMuiTheme({
  palette: {
    primary: {
      main: colors.purpleHeart,
      light: colors.heliotrope,
      dark: colors.royalPurple,
      contrastText: colors.white,
    },
    secondary: {
      main: colors.white,
      light: colors.white,
      dark: colors.white,
      contrastText: colors.royalPurple,
    },
  },
  overrides: {
    MuiDrawer: {
      paper: {
        display: 'block',
        width: defaultTheme.spacing(60),
        padding: defaultTheme.spacing(4, 5),
      },
    },
    MuiSnackbarContent: {
      root: {
        backgroundColor: '#fff',
      },
      message: {
        color: colors.rhino,
      },
    },
    MuiCssBaseline: {
      '@global': {
        '@font-face': [
          robotoThin,
          robotoThinItalic,
          robotoLight,
          robotoLightItalic,
          robotoRegular,
          robotoItalic,
          robotoMedium,
          robotoMediumItalic,
          robotoBold,
          robotoBoldItalic,
          robotoBlack,
          robotoBlackItalic,
        ],
        html: {
          boxSizing: 'border-box',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          fontSize: 16,
          fontFamily: 'Roboto, sans-serif',
        },

        body: {
          margin: 0,
          fontSize: '1rem',
          backgroundColor: colors.alabaster,
        },

        'html, body, #root': {
          height: '100%',
        },

        '#root': {
          zIndex: 1,
          position: 'relative',
        },

        '*, *::before, *::after': {
          boxSizing: 'inherit',
        },

        '@media print': {
          body: {
            backgroundColor: '#fff',
          },
        },

        '#walletconnect-wrapper': {
          zIndex: defaultTheme.zIndex.modal,
          position: 'relative',
        },
      },
    },

    MuiButton: {
      endIcon: {
        '&:empty': {
          display: 'none',
        },
      },

      startIcon: {
        '&:empty': {
          display: 'none',
        },
      },
    },

    MuiExpansionPanelSummary: {
      root: {
        '&$expanded': {
          minHeight: defaultTheme.spacing(6),
        },
      },

      content: {
        '&$expanded': {
          margin: defaultTheme.spacing(1.5, 0),
        },
      },
    },

    MuiGrid: {
      ...generateGridSpacingOverrides(defaultTheme.spacing),
    },
  },
});

export const darkTheme: Theme = createMuiTheme({
  ...defaultTheme,

  palette: {
    primary: theme.palette.secondary,
    secondary: theme.palette.primary,
    type: 'dark',
  },

  overrides: {
    ...defaultTheme.overrides,

    MuiDrawer: {
      paper: {
        ...theme.overrides?.MuiDrawer?.paper,
        backgroundColor: colors.blackCurrant,
      },
    },
  },
});

export const gradients = {
  purple: 'linear-gradient(360deg, #7357D2 0%, #8E41DC 100%)',
};
