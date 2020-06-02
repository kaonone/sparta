import * as React from 'react';
import { GetProps } from '_helpers';
import SvgIcon from '@material-ui/core/SvgIcon';

function ContainedCircleArrow(props: GetProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z"
        fill="currentColor"
        stroke="currentColor"
      />
      <path fillRule="evenodd" clipRule="evenodd" d="M12 9L16 13L8 13L12 9Z" fill="white" />
    </SvgIcon>
  );
}

export { ContainedCircleArrow };
