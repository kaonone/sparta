import * as React from 'react';
import { GetProps } from '_helpers';
import SvgIcon from '@material-ui/core/SvgIcon';

function LendIcon(props: GetProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 16 16">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.8 11.3333H4V10H8.8V11.3333ZM12 8.66658H4V7.33325H12V8.66658ZM12 6.00008H4V4.66675H12V6.00008ZM2 14.6666L3 13.6666L4 14.6666L5 13.6666L6 14.6666L7 13.6666L8 14.6666L9 13.6666L10 14.6666L11 13.6666L12 14.6666L13 13.6666L14 14.6666V1.33325L13 2.33325L12 1.33325L11 2.33325L10 1.33325L9 2.33325L8 1.33325L7 2.33325L6 1.33325L5 2.33325L4 1.33325L3 2.33325L2 1.33325V14.6666Z"
        fill="#F2994A"
      />
    </SvgIcon>
  );
}

export { LendIcon };
