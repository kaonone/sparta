import { Theme, makeStyles, colors } from 'utils/styles';

const bottomBorder = `0px 1px 0px rgba(0, 0, 0, 0.1)`;

const borderRadius = '0.25rem';

export const useStyles = makeStyles((theme: Theme) => {
  return {
    root: {
      width: '100%',

      '&$separated': {
        borderSpacing: '0 0.5rem',
        borderCollapse: 'separate',
        marginTop: '-0.5rem',
      },

      '&$compact': {
        '& td, & th': {
          padding: theme.spacing(1),

          '&:first-child': {
            borderBottomLeftRadius: '0',
          },

          '&:last-child': {
            borderBottomRightRadius: '0',
          },
        },

        '& tr': {
          borderRadius: '0',
        },
      },

      '& tr': {
        borderRadius,
        background: colors.white,
      },

      '& td, & th': {
        ...theme.typography.body1,
        padding: theme.spacing(1.5),

        '&:first-child': {
          borderTopLeftRadius: borderRadius,
          borderBottomLeftRadius: borderRadius,
        },

        '&:last-child': {
          paddingRight: theme.spacing(2),
          borderTopRightRadius: borderRadius,
          borderBottomRightRadius: borderRadius,
        },
      },

      '& thead tr': {
        backgroundColor: '#F4F3F5',
        borderRadius,
      },

      '& tbody tr': {
        boxShadow: bottomBorder,
      },

      '& thead td, & thead th': {
        color: colors.topaz,
      },
    },

    clickable: {
      cursor: 'pointer',
    },

    separated: {},

    compact: {},
  } as const;
});
