import { makeStyles, colors } from 'utils/styles';

export const useStyles = makeStyles(() => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },

  title: {
    fontWeight: 500,
    color: colors.topaz,
  },

  actions: {
    marginTop: 'auto',
  },
}));
