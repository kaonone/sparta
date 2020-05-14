import { makeStyles, Theme } from 'utils/styles';

export const useStyles = makeStyles((theme: Theme) => {
  return {
    divider: {
      backgroundColor: 'currentColor',
      opacity: 0.2,
    },

    dividerItem: {
      alignSelf: 'stretch',
    },

    metric: {
      minWidth: theme.spacing(18),
    },
  };
});
