import { makeStyles, Theme, gradients } from 'utils/styles';

export const useStyles = makeStyles((theme: Theme) => ({
  root: {
    padding: theme.spacing(3, 5),
    background: gradients.purple,
    borderRadius: 4,
    color: '#fff',
  },

  backButton: {
    color: '#fff',
  },

  title: {
    fontWeight: 600,
  },

  infoIcon: {
    position: 'relative',
    top: '0.1em',
  },

  button: {
    width: theme.spacing(15.5),
    height: theme.spacing(5.5),
    background: 'rgba(255, 255, 255, 0.2)',
  },
}));
