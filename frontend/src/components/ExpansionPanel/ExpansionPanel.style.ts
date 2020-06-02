import { makeStyles, Theme, colors } from 'utils/styles';

export const useStyles = makeStyles((theme: Theme) => ({
  root: {
    boxShadow: 'none',
    background: 'none',
  },

  toggleExpandIcon: {
    position: 'relative',
    top: '0.25em',
    marginRight: theme.spacing(1),
    color: colors.royalPurple,
  },

  summary: {
    padding: 0,
  },

  summaryContent: {
    width: 0,
    color: colors.topaz,
  },

  summaryTitle: {
    color: colors.royalPurple,
  },
}));
