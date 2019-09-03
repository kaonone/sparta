import React, { useState, useEffect, useCallback } from 'react';
import { PublicAddress, Button, Loader } from 'rimble-ui';

import styles from './Counter.module.scss';

import getTransactionReceipt from '../../utils/getTransactionReceipt';
import { utils } from '@openzeppelin/gsn-provider';
const { isRelayHubDeployedForRecipient, getRecipientFunds } = utils;

export default function Counter(props) {
  const { instance, accounts, lib, networkName, networkId, providerName } = props;
  const { _address, methods } = instance || {};

  // GSN provider has only one key pair
  const isGSN = providerName === 'GSN';

  const [balance, setBalance] = useState(0);

  const getBalance = useCallback(async () => {
    let balance =
      accounts && accounts.length > 0 ? lib.utils.fromWei(await lib.eth.getBalance(accounts[0]), 'ether') : 'Unknown';
    setBalance(Number(balance));
  }, [accounts, lib.eth, lib.utils]);

  useEffect(() => {
    if (!isGSN) getBalance();
  }, [accounts, getBalance, isGSN, lib.eth, lib.utils, networkId]);

  const [, setIsDeployed] = useState(false);
  const [funds, setFunds] = useState(0);

  const getDeploymentAndFunds = useCallback(async () => {
    if (instance) {
      if (isGSN) {
        // if GSN check how much funds recipient has
        const isDeployed = await isRelayHubDeployedForRecipient(lib, _address);

        setIsDeployed(isDeployed);
        if (isDeployed) {
          const funds = await getRecipientFunds(lib, _address);
          setFunds(Number(funds));
        }
      }
    }
  }, [_address, instance, isGSN, lib]);

  useEffect(() => {
    getDeploymentAndFunds();
  }, [getDeploymentAndFunds, instance]);

  const [count, setCount] = useState(0);

  const getCount = useCallback(async () => {
    if (instance) {
      // Get the value from the contract to prove it worked.
      const response = await instance.methods.getCounter().call();
      // Update state with the result.
      setCount(response);
    }
  }, [instance]);

  useEffect(() => {
    getCount();
  }, [getCount, instance]);

  const [sending, setSending] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');

  const increase = async number => {
    try {
      if (!sending) {
        setSending(true);

        const tx = await instance.methods.increaseCounter(number).send({ from: accounts[0] });
        const receipt = await getTransactionReceipt(lib, tx.transactionHash);
        setTransactionHash(receipt.transactionHash);

        getCount();
        getDeploymentAndFunds();

        setSending(false);
      }
    } catch (e) {
      setSending(false);
      console.log(e);
    }
  };

  const decrease = async number => {
    try {
      if (!sending) {
        setSending(true);

        const receipt = await instance.methods.decreaseCounter(number).send({ from: accounts[0] });
        setTransactionHash(receipt.transactionHash);

        getCount();
        getDeploymentAndFunds();

        setSending(false);
      }
    } catch (e) {
      setSending(false);
      console.log(e);
    }
  };

  function renderNoDeploy() {
    return (
      <div>
        <p>
          <strong>Can't Load Deployed Counter Instance</strong>
        </p>
        <p>Please, run `oz create` to deploy an counter instance.</p>
      </div>
    );
  }

  function renderNoFunds() {
    return (
      <div>
        <p>
          <strong>The recipient has no funds</strong>
        </p>
        <p>Please, run:</p>
        <div className={styles.code}>
          <code>
            <small>npx oz-gsn fund-recipient --recipient {_address}</small>
          </code>
        </div>
        <p>to fund the recipient on local network.</p>
      </div>
    );
  }

  function renderNoBalance() {
    return (
      <div>
        <p>
          <strong>Fund your Metamask account</strong>
        </p>
        <p>You need some ETH to be able to send transactions. Please, run:</p>
        <div className={styles.code}>
          <code>
            <small>openzeppelin transfer --to {accounts[0]}</small>
          </code>
        </div>
        <p>to fund your Metamask.</p>
      </div>
    );
  }

  function renderTransactionHash() {
    return (
      <div>
        <p>
          Transaction{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://${networkName}.etherscan.io/tx/${transactionHash}`}
          >
            <small>{transactionHash.substr(0, 6)}</small>
          </a>{' '}
          has been mined on {networkName} network.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.counter}>
      <h3> Counter Instance </h3>
      {lib && !instance && renderNoDeploy()}
      {lib && instance && (
        <React.Fragment>
          <div className={styles.dataPoint}>
            <div className={styles.label}>Instance address:</div>
            <div className={styles.value}>
              <PublicAddress label="" address={_address} />
            </div>
          </div>
          <div className={styles.dataPoint}>
            <div className={styles.label}>Counter Value:</div>
            <div className={styles.value}>{count}</div>
          </div>
          {isGSN && (
            <div className={styles.dataPoint}>
              <div className={styles.label}>Recipient Funds:</div>
              <div className={styles.value}>{lib.utils.fromWei(funds.toString(), 'ether')} ETH</div>
            </div>
          )}
          {isGSN && !funds && renderNoFunds()}
          {!isGSN && !balance && renderNoBalance()}

          {(!!funds || !!balance) && (
            <React.Fragment>
              <div className={styles.label}>
                <strong>Counter Actions</strong>
              </div>
              <div className={styles.buttons}>
                <Button onClick={() => increase(1)} size="small">
                  {sending ? <Loader className={styles.loader} color="white" /> : <span> Increase Counter by 1</span>}
                </Button>
                <Button onClick={() => decrease(1)} disabled={!(methods && methods.decreaseCounter)} size="small">
                  {sending ? <Loader className={styles.loader} color="white" /> : <span> Decrease Counter by 1</span>}
                </Button>
              </div>
            </React.Fragment>
          )}
          {transactionHash && networkName !== 'Private' && renderTransactionHash()}
        </React.Fragment>
      )}
    </div>
  );
}
