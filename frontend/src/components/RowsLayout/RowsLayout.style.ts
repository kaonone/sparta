import { makeStyles } from 'utils/styles';

export const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    overflow: 'hidden', // https://github.com/mui-org/material-ui/issues/7466
  },

  container: {
    flexGrow: 1,
  },
}));
