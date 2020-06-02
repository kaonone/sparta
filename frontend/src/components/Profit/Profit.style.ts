import { makeStyles, colors } from 'utils/styles';

export const useStyles = makeStyles(() => ({
  root: {
    '&$increase': {
      color: colors.shamrock,
    },

    '&$decrease': {
      color: colors.geraldine,
    },
  },

  icon: {
    position: 'relative',
    top: '.125em;',
    fontSize: 'inherit',

    '&$decrease': {
      transform: 'rotate(90deg)',
    },
  },

  increase: {},

  decrease: {},
}));
