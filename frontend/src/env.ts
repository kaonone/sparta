import { getEnv, Mode } from 'core/getEnv';
import { zeroAddress } from 'utils/mock';

export type NetworkID = 1 | 4 | 42;

type NetworkNameByID = {
  1: 'mainnet';
  4: 'rinkeby';
  42: 'kovan';
};

type EtherscanDomainByID = {
  1: 'https://etherscan.io/';
  4: 'https://rinkeby.etherscan.io/';
  42: 'https://kovan.etherscan.io/';
};

interface INetworkConfig<ID extends NetworkID = 1> {
  id: ID;
  name: NetworkNameByID[ID];
  contracts: {
    dai: string;
    usdc: string;
    ptk: string;
    pool: string;
    curveModule: string;
    fundsModule: string;
    defiModule: string;
    liquidityModule: string;
    loanModule: string;
    loanLimitsModule: string;
    loanProposalsModule: string;
    arbitrageModule: string;
    flashLoanModule: string;
    swapTokens: Record<string, string>;
    balancerExchangeProxy: string;
    uniswapRouter: string;
  };
  etherskanDomain: EtherscanDomainByID[ID];
}

const ethNetworkConfigForBeta: INetworkConfig<4> = {
  id: 4,
  name: 'rinkeby',
  contracts: {
    dai: '0x3F5B698332572Fb6188492F5D53ba75f81797F9d',
    usdc: zeroAddress,
    pool: '0x17d7aFC6604C3933913960110Cfa5c436eb0dB45',
    ptk: '0x2dC45475c35AB01eC7eEA16a843246e8c67D6C82',
    curveModule: '0xD5F67aa0af6be5c10389A8AC5d2392ee60e8D1Cb',
    liquidityModule: '0xfC95422e89e1892D939B103e73e80d60030b02A5',
    loanModule: '0xCA7c5AcF5686d4fdF1a439FE356d66638371Db64',
    loanLimitsModule: zeroAddress,
    loanProposalsModule: zeroAddress,
    fundsModule: '0x3b1E2e62A4332BAb55A3e935EeaC95aF71002E7B',
    defiModule: zeroAddress,
    arbitrageModule: zeroAddress,
    flashLoanModule: zeroAddress,
    swapTokens: {},
    balancerExchangeProxy: zeroAddress,
    uniswapRouter: zeroAddress,
  },
  etherskanDomain: 'https://rinkeby.etherscan.io/',
};

const ethNetworkConfigForStaging: INetworkConfig<42> = {
  id: 42,
  name: 'kovan',
  contracts: {
    dai: '0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa',
    usdc: zeroAddress,
    ptk: '0xcC64F821A6C32884C0648C12E62585FdBC7bA082',
    pool: '0xBc4C64C8F5838C4A7e10Ac9bB0b606D3AD4c8809',
    curveModule: '0xBA9d498AA8d650b9ce38D6cE5B0d6539d254A3e8',
    fundsModule: '0x29518F102cC748d30178e1fB6215f2BEF4a85b86',
    defiModule: '0xDc6b5507647137B663fe81C4aBA6912a88eF9F73',
    liquidityModule: '0x03843c8a5b7A6c4F563CF5514E53286A7f934ea0',
    loanModule: zeroAddress,
    loanLimitsModule: zeroAddress,
    loanProposalsModule: zeroAddress,
    arbitrageModule: '0x220F8d93889fD51528b7b119FF7C9a10149EbCf2',
    flashLoanModule: '0x310879fEf4e301425336eBC2f58C29bd5127d174',
    swapTokens: {
      "USDC'B": '0x2F375e94FC336Cdec2Dc0cCB5277FE59CBf1cAe5',
      "DAI'B": '0x1528F3FCc26d13F7079325Fb78D9442607781c8C',
      "MKR'B": '0xef13C0c8abcaf5767160018d268f9697aE4f5375',
      WETH: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
    },
    balancerExchangeProxy: '0xd9c8ae0ecf77d0f7c1c28b4f6991a041963545d6',
    uniswapRouter: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
  },
  etherskanDomain: 'https://kovan.etherscan.io/',
};

const ethNetworkConfigForProd: INetworkConfig = {
  id: 1,
  name: 'mainnet',
  contracts: {
    dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    ptk: '0x764112eCFFDdB111f78e9475d70010fD1120257f',
    pool: '0x3501d2c95F8dB9A94E0f0BCD15E2a440C71ceaE4',
    curveModule: '0xa6d9d61c6637e8d1ab1f535baabb53e756559cdc',
    fundsModule: '0x1dEA32aAd5Ef531538CdC7eab515072aBc65d855',
    defiModule: '0xEEbaf85E5452F11e33e059ADb3F2F10E748a3562',
    liquidityModule: '0x23b1Fb463a87815F6f8714bc4af9Ce8214C4c748',
    loanModule: zeroAddress,
    loanLimitsModule: zeroAddress,
    loanProposalsModule: zeroAddress,
    arbitrageModule: '0x6E2CFb462D04b2385fE5d1D16A6e0A8154fd201e',
    flashLoanModule: '0x7cD7833930E7fb43Fc4F221eBfFE3eFAE39D1442',
    swapTokens: {
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      ZRX: '0xE41d2489571d322189246DaFA5ebDe1F4699F498',
      REP: '0x1985365e9f78359a9B6AD760e32412f4a445E862',
      'BTC++': '0x0327112423F3A68efdF1fcF402F6c5CB9f7C33fd',
      BAT: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
      SNX: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
      LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      sUSD: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
      DZAR: '0x9Cb2f26A23b8d89973F08c957C4d7cdf75CD341c',
    },
    balancerExchangeProxy: '0x6317c5e82a06e1d8bf200d21f4510ac2c038ac81',
    uniswapRouter: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
  },
  etherskanDomain: 'https://etherscan.io/',
};

const ethNetworkConfigForBetaDefi: INetworkConfig<4> = {
  id: 4,
  name: 'rinkeby',
  contracts: {
    dai: '0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa',
    usdc: zeroAddress,
    pool: '0x8FA73B29f37C9c5290819BAfd4Aea177E832423e',
    ptk: '0xB879fD0e690171cea96aC7Df262BC751d0370E79',
    curveModule: '0x29e2Dc9BF33A20d10Df342b59b4aE0201924bd86',
    liquidityModule: '0xC999b3646c477Cc9eE0B44183A2571cE6e8F5E10',
    loanModule: '0x5F7EAEBAF88cBfDd586A6235E28A57e6BD56131d',
    loanLimitsModule: '0xb5b1d22044b61b385d69D7c465bB0BA082EaACdB',
    loanProposalsModule: '0x06Da2A4EB6e39C28D37E011e1D4345352b96FC08',
    fundsModule: '0xFDba597C53c2434aE7461c36812377c7bB238AF3',
    defiModule: '0x68CD145fF4620c4849EC2141F25766083B855c8a',
    arbitrageModule: zeroAddress,
    flashLoanModule: zeroAddress,
    swapTokens: {},
    balancerExchangeProxy: zeroAddress,
    uniswapRouter: zeroAddress,
  },
  etherskanDomain: 'https://rinkeby.etherscan.io/',
};

export const ETH_NETWORK_CONFIG = {
  prod: ethNetworkConfigForProd,
  beta: ethNetworkConfigForBeta,
  'beta-defi': ethNetworkConfigForBetaDefi,
  sandbox: ethNetworkConfigForStaging,
}[getEnv().mode];
export const NETWORK_ID: NetworkID = ETH_NETWORK_CONFIG.id;
export const SWARM_GATEWAY_URL = 'https://swarm-gateways.net';
// TODO take from contract
export const MIN_COLLATERAL_PERCENT_FOR_BORROWER = 50;
export const PLEDGE_MARGIN_DIVIDER = 1000000;

const subgraphHttpUrlsByMode: Record<Mode, string> = {
  prod: 'https://api.thegraph.com/subgraphs/name/in19farkt/akropolis-os-pension-fund-prod',
  beta: 'https://api.thegraph.com/subgraphs/name/alekspickle/akropolis-os-beta',
  'beta-defi': 'https://api.thegraph.com/subgraphs/name/alekspickle/akropolis-os-beta-defi',
  sandbox: 'https://api.thegraph.com/subgraphs/name/in19farkt/akropolis-os-pension-fund',
};

const subgraphWsUrlsByMode: Record<Mode, string> = {
  prod: 'wss://api.thegraph.com/subgraphs/name/in19farkt/akropolis-os-pension-fund-prod',
  beta: 'wss://api.thegraph.com/subgraphs/name/alekspickle/akropolis-os-beta',
  'beta-defi': 'wss://api.thegraph.com/subgraphs/name/alekspickle/akropolis-os-beta-defi',
  sandbox: 'wss://api.thegraph.com/subgraphs/name/in19farkt/akropolis-os-pension-fund',
};

export const SUBGRAPH_HTTP_URL = subgraphHttpUrlsByMode[getEnv().mode];
export const SUBGRAPH_WS_URL = subgraphWsUrlsByMode[getEnv().mode];
