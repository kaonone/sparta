import React, { useState, useCallback, useRef } from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import CopyToClipboard from 'react-copy-to-clipboard';

import { useTheme } from 'utils/styles';
import { getShortAddress } from 'utils/format';

import { useStyles } from './ShortAddress.style';

function ShortAddress({ address }: { address: string }) {
  const classes = useStyles();
  const theme = useTheme();

  const [tooltipTitle, setTooltipTitle] = useState<'copy' | 'copied!'>('copy');
  const closeTimeout = useRef(0);

  const shortAddress = getShortAddress(address);

  const handleCopy = useCallback(() => {
    setTooltipTitle('copied!');
  }, []);

  const handleTooltipClose = useCallback(() => {
    if (tooltipTitle !== 'copy') {
      closeTimeout.current = window.setTimeout(
        () => setTooltipTitle('copy'),
        theme.transitions.duration.shorter,
      );
    }
  }, [tooltipTitle]);

  const handleTooltipOpen = useCallback(() => {
    clearTimeout(closeTimeout.current);
  }, [tooltipTitle]);

  return (
    <Tooltip
      className={classes.tooltip}
      title={tooltipTitle}
      onClose={handleTooltipClose}
      onOpen={handleTooltipOpen}
      placement="bottom"
    >
      <CopyToClipboard text={address} onCopy={handleCopy}>
        <span className={classes.shortAddress}>{shortAddress}</span>
      </CopyToClipboard>
    </Tooltip>
  );
}

export { ShortAddress };
