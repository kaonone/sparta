import { makeStyles, Theme } from 'utils/styles';

export const useStyles = makeStyles((theme: Theme) => ({
  rootRowsLayout: {
    minWidth: theme.breakpoints.values.md,
    maxWidth: theme.breakpoints.values.lg,
    margin: '0 auto',
    padding: theme.spacing(0, 1, 1),
  },
}));
