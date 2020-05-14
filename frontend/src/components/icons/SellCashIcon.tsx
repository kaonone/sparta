import * as React from 'react';
import { GetProps } from '_helpers';
import SvgIcon from '@material-ui/core/SvgIcon';

function SellCashIcon(props: GetProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.354 3.604a.5.5 0 0 0-.707 0L7.513 5.738a.3.3 0 0 0 .212.512H9.25V13h1.5V6.25h1.526a.3.3 0 0 0 .212-.512l-2.134-2.134z"
        fill="currentColor"
      />
      <path
        opacity=".8"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.75 3.25h-3.069a.3.3 0 0 0-.257.455l.626 1.037h2.7v10.523H3.25V4.742h2.7l.626-1.037a.3.3 0 0 0-.257-.455H3.25c-.825 0-1.5.675-1.5 1.5v10.5c0 .825.675 1.5 1.5 1.5h13.5c.825 0 1.5-.675 1.5-1.5V4.75c0-.825-.675-1.5-1.5-1.5z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export { SellCashIcon };
