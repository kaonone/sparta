import * as React from 'react';
import { GetProps } from '_helpers';
import SvgIcon from '@material-ui/core/SvgIcon';

function BuyCashIcon(props: GetProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 20 20">
      <path
        opacity=".8"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.75 3.25h-4a.5.5 0 0 0-.5.5v.492a.5.5 0 0 0 .5.5h4v10.523H3.25V4.742h4a.5.5 0 0 0 .5-.5V3.75a.5.5 0 0 0-.5-.5h-4c-.825 0-1.5.675-1.5 1.5v10.5c0 .825.675 1.5 1.5 1.5h13.5c.825 0 1.5-.675 1.5-1.5V4.75c0-.825-.675-1.5-1.5-1.5z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.648 12.646a.5.5 0 0 0 .707 0l2.134-2.134a.3.3 0 0 0-.212-.512H10.75V3.75a.5.5 0 0 0-.5-.5h-.5a.5.5 0 0 0-.5.5V10H7.725a.3.3 0 0 0-.212.512l2.135 2.134z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export { BuyCashIcon };
