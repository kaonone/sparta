import { makeStyles } from 'utils/styles';

export const useStyles = makeStyles(() => {
  return {
    shortAddress: {
      fontSize: 'inherit',
      color: 'inherit',
    },
    tooltip: {
      cursor: 'pointer',
      borderBottom: '1px dashed',
    },
  };
});
