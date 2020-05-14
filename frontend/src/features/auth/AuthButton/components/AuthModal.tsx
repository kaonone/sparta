import * as React from 'react';

import { CommunicationState } from 'utils/react';
import {
  Button,
  Loading,
  Dialog,
  DialogTitle,
  DialogContent,
  Hint,
  Typography,
  Box,
  ShortAddress,
  Grid,
} from 'components';
import { WalletType, wallets, Web3ConnectionStatus } from 'services/api';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { ETH_NETWORK_CONFIG } from 'env';

interface AuthModalProps {
  isOpened: boolean;
  connectCommunication: CommunicationState<any, any>;
  account: string | null | undefined;
  status: Web3ConnectionStatus;
  connectedWallet: WalletType | null;
  onClose(): void;
  connect(wallet: WalletType): void;
  disconnect(): void;
}

const tKeys = tKeysAll.features.auth;

export function AuthModal(props: AuthModalProps) {
  const {
    isOpened,
    onClose,
    connectCommunication,
    connect,
    account,
    disconnect,
    status,
    connectedWallet,
  } = props;
  const { t } = useTranslate();
  const isLogged: boolean = !!account && !!connectedWallet;

  return (
    // tabIndex needed for Fortmatic form. Without tabIndex, form input cannot be taken into focus
    <Dialog open={isOpened} onClose={onClose} TransitionProps={{ tabIndex: 'unset' } as any}>
      <DialogTitle>
        {isLogged ? 'Choose another wallet or disconnect:' : 'Choose your wallet:'}
      </DialogTitle>
      <Loading
        component={DialogContent}
        meta={{ loaded: status !== 'pending', error: null }}
        communication={connectCommunication}
      />
      {isLogged && (
        <DialogContent>
          <Hint>
            <Box>
              <Typography>Your wallet provider: &quot;{connectedWallet}&quot;.</Typography>
              <Typography>
                Your wallet address: {account && <ShortAddress address={account} />}.
              </Typography>
            </Box>
          </Hint>
        </DialogContent>
      )}
      <DialogContent>
        <Hint>
          <Typography>
            {t(tKeys.applicationNetwork.getKey(), { networkName: ETH_NETWORK_CONFIG.name })}.
          </Typography>
        </Hint>
      </DialogContent>
      <DialogContent>
        <Hint>
          <Typography>By connecting to the wallet you accept Terms of Service.</Typography>
        </Hint>
      </DialogContent>
      <DialogContent>
        <Grid container spacing={1}>
          {isLogged && (
            <Grid item xs>
              <Button fullWidth color="primary" variant="outlined" onClick={disconnect}>
                Disconnect
              </Button>
            </Grid>
          )}
          {wallets.map((type, index) => (
            <Grid item xs key={index}>
              <ConnectButton
                connect={connect}
                type={type}
                key={type}
                disabled={type === connectedWallet}
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}

interface ConnectButtonProps {
  connect(wallet: WalletType): void;
  type: WalletType;
  disabled: boolean;
}

function ConnectButton({ type, connect, disabled }: ConnectButtonProps) {
  const handleClick = React.useCallback(() => connect(type), [type]);

  return (
    <Button fullWidth color="primary" variant="contained" onClick={handleClick} disabled={disabled}>
      <Box component="span" whiteSpace="nowrap">
        {type}
      </Box>
    </Button>
  );
}
