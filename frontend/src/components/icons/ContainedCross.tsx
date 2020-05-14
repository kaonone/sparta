import * as React from 'react';
import { GetProps } from '_helpers';
import SvgIcon from '@material-ui/core/SvgIcon';

function ContainedCross(props: GetProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.0003 1.66667C5.39199 1.66667 1.66699 5.39167 1.66699 10C1.66699 14.6083 5.39199 18.3333 10.0003 18.3333C14.6087 18.3333 18.3337 14.6083 18.3337 10C18.3337 5.39167 14.6087 1.66667 10.0003 1.66667ZM14.1667 12.9917L12.9917 14.1667L10 11.175L7.00833 14.1667L5.83333 12.9917L8.825 10L5.83333 7.00833L7.00833 5.83333L10 8.825L12.9917 5.83333L14.1667 7.00833L11.175 10L14.1667 12.9917Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export { ContainedCross };
