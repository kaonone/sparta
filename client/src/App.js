import React, { useState } from 'react';

// eslint-disable-next-line no-unused-vars
import { useWeb3Network, useEphemeralKey, useWeb3Injected } from '@openzeppelin/network/react';

import Header from './components/Header/index.js';
import Footer from './components/Footer/index.js';
import Hero from './components/Hero/index.js';
import Web3Info from './components/Web3Info/index.js';
import Counter from './components/Counter/index.js';

import styles from './App.module.scss';

// const infuraToken = process.env.REACT_APP_INFURA_TOKEN;
// eslint-disable-next-line no-unused-vars
const infuraToken = '95202223388e49f48b423ea50a70e336';

function App() {
  // get ephemeralKey
  // eslint-disable-next-line no-unused-vars
  const signKey = useEphemeralKey();

  // get GSN web3
  // const context = useWeb3Network(`wss://rinkeby.infura.io/ws/v3/${infuraToken}`, {
  //   pollInterval: 15 * 1000,
  //   gsn: {
  //     signKey,
  //   },
  // });

  // const context = useWeb3Network('http://127.0.0.1:8545', {
  //   gsn: {
  //     dev: true,
  //     signKey,
  //   },
  // });

  const context = useWeb3Injected();

  // load Counter json artifact
  let counterJSON = undefined;
  try {
    // see https://github.com/OpenZeppelin/solidity-loader
    counterJSON = require('../../contracts/Counter.sol');
  } catch (e) {
    console.log(e);
  }

  // load Counter instance
  const [counterInstance, setCounterInstance] = useState(undefined);
  let deployedNetwork = undefined;
  if (!counterInstance && context && counterJSON && counterJSON.networks && context.networkId) {
    deployedNetwork = counterJSON.networks[context.networkId.toString()];
    if (deployedNetwork) {
      setCounterInstance(new context.lib.eth.Contract(counterJSON.abi, deployedNetwork.address));
    }
  }

  function renderNoWeb3() {
    return (
      <div className={styles.loader}>
        <h3>Web3 Provider Not Found</h3>
        <p>Please, install and run Ganache.</p>
      </div>
    );
  }

  return (
    <div className={styles.App}>
      <Header />
      <Hero />
      <div className={styles.wrapper}>
        {!context.lib && renderNoWeb3()}
        <div className={styles.contracts}>
          <h1>BUIDL with GSN Kit!</h1>
          <div className={styles.widgets}>
            <Web3Info title="Web3 Provider" context={context} />
            <Counter {...context} JSON={counterJSON} instance={counterInstance} deployedNetwork={deployedNetwork} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
