import { Theme, colors, makeStyles } from 'utils/styles';

export const useStyles = makeStyles((theme: Theme) => {
  return {
    root: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '0.25rem',
      backgroundColor: colors.whiteLilac,
      textAlign: 'center',

      '&$isSmall': {
        padding: theme.spacing(0.5, 1.5),
        minHeight: theme.spacing(4),
      },

      '&$isMedium': {
        padding: theme.spacing(1.5, 3),
        minHeight: theme.spacing(6),
      },
    },

    isSmall: {},
    isMedium: {},
  };
});
