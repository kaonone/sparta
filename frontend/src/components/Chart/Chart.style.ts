import { makeStyles, Theme, colors } from 'utils/styles';

export const useStyles = makeStyles((theme: Theme) => {
  const graphicMarginBottom = theme.spacing(1);
  const switchButtonsHeight = 25;
  const graphicHeight = `calc(100% - ${graphicMarginBottom}px - ${switchButtonsHeight}px)`;

  return {
    root: {
      height: '100%',
    },

    graphic: {
      height: graphicHeight,
      marginBottom: graphicMarginBottom,
    },

    switchButton: {
      minWidth: 'unset',
      fontSize: '0.625rem',
    },

    tick: {
      fill: colors.frenchGray,
      fontSize: '0.625rem',
      fontWeight: 500,
      textTransform: 'uppercase',
    },
  };
});
