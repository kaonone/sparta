import * as React from 'react';
import { GetProps } from '_helpers';
import SvgIcon from '@material-ui/core/SvgIcon';

function Checked(props: GetProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.99996 1.66669C5.39996 1.66669 1.66663 5.40002 1.66663 10C1.66663 14.6 5.39996 18.3334 9.99996 18.3334C14.6 18.3334 18.3333 14.6 18.3333 10C18.3333 5.40002 14.6 1.66669 9.99996 1.66669ZM8.33394 14.1664L4.16728 9.99976L5.34228 8.82476L8.33394 11.8081L14.6589 5.48309L15.8339 6.66643L8.33394 14.1664Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export { Checked };
