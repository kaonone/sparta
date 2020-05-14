import * as React from 'react';
import { GetProps } from '_helpers';

import { useApi } from 'services/api';
import { getShortAddress } from 'utils/format';
import { useSubscribable, useCommunication } from 'utils/react';
import { Button, Loading } from 'components';

import { AuthModal } from './components/AuthModal';

type IProps = Pick<GetProps<typeof Button>, 'color'> & {};

export function AuthButton(props: IProps) {
  const { color } = props;
  const [isOpened, setIsOpened] = React.useState(false);
  const api = useApi();

  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);
  const [status] = useSubscribable(() => api.web3Manager.status, [], 'pending');
  const [connectedWallet] = useSubscribable(() => api.web3Manager.connectedWallet, [], null);

  const connectCommunication = useCommunication(api.web3Manager.connect, []);

  const toggleIsOpened = React.useCallback(() => setIsOpened(!isOpened), [isOpened]);

  const handleDisconnectClick = React.useCallback(() => {
    api.web3Manager.disconnect();
    connectCommunication.reset();
  }, [connectCommunication.reset]);

  return (
    <>
      <Button
        color={color}
        variant="outlined"
        onClick={toggleIsOpened}
        endIcon={
          <Loading
            ignoreError
            meta={{ loaded: status !== 'pending', error: null }}
            communication={connectCommunication}
            progressVariant="circle"
            progressProps={{
              size: 24,
            }}
          />
        }
      >
        <Loading meta={accountMeta}>
          {account ? getShortAddress(account) : 'Connect to wallet'}
        </Loading>
      </Button>
      <AuthModal
        status={status}
        connectedWallet={connectedWallet}
        isOpened={isOpened}
        onClose={toggleIsOpened}
        account={account}
        connectCommunication={connectCommunication}
        connect={connectCommunication.execute}
        disconnect={handleDisconnectClick}
      />
    </>
  );
}
