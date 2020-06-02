import * as React from 'react';
import Snackbar from '@material-ui/core/Snackbar';

import { PRIVACY_POLICY_URL } from 'docs';
import { Link, Button } from 'components';

import { cookiesStorage } from '../cookiesStorage';

export function CookiesMsg() {
  const [hideCookiesMsg, setHideCookiesMsg] = React.useState(() =>
    cookiesStorage.getItem('hideCookiesMsg'),
  );

  const handleClose = React.useCallback(() => {
    cookiesStorage.setItem('hideCookiesMsg', true);
    setHideCookiesMsg(true);
  }, []);

  return (
    <Snackbar
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      open={!hideCookiesMsg}
      onClose={handleClose}
      ContentProps={{
        'aria-describedby': 'message-id',
      }}
      message={
        <span id="message-id">
          We use cookies on our website. By continuing to use the site, or by clicking &quot;I
          agree&quot;, you consent to the use of cookies. For more info&nbsp;
          <Link href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
            click here
          </Link>
        </span>
      }
      action={[
        <Button key="agree" color="primary" variant="outlined" size="small" onClick={handleClose}>
          I agree
        </Button>,
      ]}
    />
  );
}
