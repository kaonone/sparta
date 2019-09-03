import React, { useState, useEffect, useCallback } from 'react';
import { PublicAddress, Button } from 'rimble-ui';
import styles from './Web3Info.module.scss';

export default function Web3Info(props) {
  const { context } = props;
  const { networkId, networkName, accounts, providerName, lib } = context;

  const [balance, setBalance] = useState(0);

  const getBalance = useCallback(async () => {
    let balance =
      accounts && accounts.length > 0 ? lib.utils.fromWei(await lib.eth.getBalance(accounts[0]), 'ether') : 'Unknown';
    setBalance(balance);
  }, [accounts, lib.eth, lib.utils]);

  useEffect(() => {
    getBalance();
  }, [accounts, getBalance, networkId]);

  const requestAuth = async web3Context => {
    try {
      await web3Context.requestAuth();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={styles.web3}>
      <h3> {props.title} </h3>
      <div className={styles.dataPoint}>
        <div className={styles.label}>Network:</div>
        <div className={styles.value}>{networkId ? `${networkId} – ${networkName}` : 'No connection'}</div>
      </div>
      <div className={styles.dataPoint}>
        <div className={styles.label}>Your address:</div>
        <div className={styles.value}>
          <PublicAddress label="" address={accounts && accounts.length ? accounts[0] : 'Unknown'} />
        </div>
      </div>
      <div className={styles.dataPoint}>
        <div className={styles.label}>Your ETH balance:</div>
        <div className={styles.value}>{balance}</div>
      </div>
      <div className={styles.dataPoint}>
        <div className={styles.label}>Provider:</div>
        <div className={styles.value}>{providerName}</div>
      </div>
      {accounts && accounts.length ? (
        <div className={styles.dataPoint}>
          <div className={styles.label}>Accounts & Signing Status</div>
          <div className={styles.value}>Access Granted</div>
        </div>
      ) : !!networkId && providerName !== 'infura' ? (
        <div>
          <br />
          <Button onClick={() => requestAuth(context)}>Request Access</Button>
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
}
