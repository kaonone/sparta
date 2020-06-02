import { Theme, makeStyles, colors } from 'utils/styles';

export const useStyles = makeStyles((theme: Theme) => ({
  root: {
    height: '100%',
  },

  title: {
    fontWeight: 500,
    color: colors.topaz,
  },

  header: {
    marginBottom: theme.spacing(3),
  },

  headerTitle: {
    color: colors.topaz,
  },

  avatar: {
    width: theme.spacing(3),
    height: theme.spacing(3),
    marginRight: '-0.375rem',
  },

  membersCount: {
    display: 'flex',
    alignItems: 'center',
    minWidth: theme.spacing(3),
    height: theme.spacing(3),
    padding: theme.spacing(0, 1),
    borderRadius: theme.spacing(1.5),
    backgroundColor: colors.athensGray,
    color: colors.haiti,
  },

  balanceValue: {
    marginRight: theme.spacing(1),
    lineHeight: 1.15,
  },

  graphic: {
    width: '100%',
    marginTop: theme.spacing(2),
    height: '270px',
  },
}));
