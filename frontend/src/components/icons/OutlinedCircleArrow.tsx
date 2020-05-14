import * as React from 'react';
import { GetProps } from '_helpers';
import SvgIcon from '@material-ui/core/SvgIcon';

function OutlinedCircleArrow(props: GetProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
        fill="#F7F5FB"
        stroke="currentColor"
      />
      <path fillRule="evenodd" clipRule="evenodd" d="M12 15L8 11H16L12 15Z" fill="currentColor" />
    </SvgIcon>
  );
}

export { OutlinedCircleArrow };
