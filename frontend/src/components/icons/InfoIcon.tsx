import * as React from 'react';
import { GetProps } from '_helpers';
import SvgIcon from '@material-ui/core/SvgIcon';

function InfoIcon(props: GetProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        opacity=".2"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        fill="#fff"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13 16a1 1 0 1 1-2 0v-4a1 1 0 1 1 2 0v4zM13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"
        fill="#fff"
      />
    </SvgIcon>
  );
}

export { InfoIcon };
