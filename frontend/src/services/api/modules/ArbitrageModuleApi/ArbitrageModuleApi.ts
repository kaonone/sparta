import { Observable, timer, BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { autobind } from 'core-decorators';
import BN from 'bn.js';
import * as R from 'ramda';
import { TransactionObject } from 'web3/eth/types';
import Web3 from 'web3';

import { memoize } from 'utils/decorators';
import { zeroAddress } from 'utils/mock';
import { createArbitrageModule } from 'generated/contracts';
import arbitrageExecutorABI from 'utils/abiNotGen/arbitrageExecutor.json';
import { ETH_NETWORK_CONFIG } from 'env';
import {
  SwapTerms,
  Protocol,
  SwapTermsRequest,
  ProtocolTerms,
  ProtocolTermsGeneric,
} from 'model/types';

import { Web3ManagerModule, Contracts } from '../../types';
import { getBalancerTerms } from './getBalancerTerms';
import { getUniswapTerms } from './getUniswapTerms';
import { GetTermsFunction } from './types';
import { TransactionsApi } from '../TransactionsApi';
import { FlashLoanModuleApi } from '../FlashLoanModuleApi';
import { TokensApi } from '../TokensApi';

const termsGetterByProtocol: Record<Protocol, GetTermsFunction> = {
  'uniswap-v2': getUniswapTerms,
  balancer: getBalancerTerms,
};

function getCurrentValueOrThrow<T>(subject: BehaviorSubject<T | null>): NonNullable<T> {
  const value = subject.getValue();

  if (value === null || value === undefined) {
    throw new Error('Subject is not contain non nullable value');
  }

  return value as NonNullable<T>;
}

export class ArbitrageModuleApi {
  private readonlyContract: Contracts['arbitrageModule'];
  private txContract = new BehaviorSubject<null | Contracts['arbitrageModule']>(null);

  constructor(
    private web3Manager: Web3ManagerModule,
    private transactionsApi: TransactionsApi,
    private flashLoanApi: FlashLoanModuleApi,
    private tokensApi: TokensApi,
  ) {
    this.readonlyContract = createArbitrageModule(
      web3Manager.web3,
      ETH_NETWORK_CONFIG.contracts.arbitrageModule,
    );

    this.web3Manager.txWeb3
      .pipe(
        map(
          txWeb3 =>
            txWeb3 && createArbitrageModule(txWeb3, ETH_NETWORK_CONFIG.contracts.arbitrageModule),
        ),
      )
      .subscribe(this.txContract);
  }

  @memoize(R.identity)
  @autobind
  public getExecutorAddress$(account: string): Observable<string | null> {
    return this.readonlyContract.methods
      .executors(
        { '': account },
        this.readonlyContract.events.ExecutorCreated({ filter: { beneficiary: account } }),
      )
      .pipe(map(executor => (executor === zeroAddress ? null : executor)));
  }

  @memoize((executor: string, tokens: string[]) => tokens.concat(executor).join())
  @autobind
  public getTokensApproved$(executor: string, tokens: string[]): Observable<boolean> {
    const minAllowance = new BN(2).pow(new BN(250));

    return combineLatest(
      tokens
        .map(token => [
          this.tokensApi.getErc20Allowance$(
            token,
            executor,
            ETH_NETWORK_CONFIG.contracts.balancerExchangeProxy,
          ),
          this.tokensApi.getErc20Allowance$(
            token,
            executor,
            ETH_NETWORK_CONFIG.contracts.uniswapRouter,
          ),
        ])
        .flat(),
    ).pipe(map(allowances => !allowances.some(allowance => allowance.lt(minAllowance))));
  }

  @autobind
  public async createExecutor(fromAddress: string): Promise<void> {
    const txModule = getCurrentValueOrThrow(this.txContract);

    const promiEvent = txModule.methods.createExecutor(undefined, { from: fromAddress });

    this.transactionsApi.pushToSubmittedTransactions$('arbitrage.createExecutor', promiEvent, {
      address: fromAddress,
    });

    await promiEvent;
  }

  @autobind
  public async approveTokens(
    fromAddress: string,
    executor: string,
    tokens: string[],
  ): Promise<void> {
    const txWeb3 = getCurrentValueOrThrow(this.web3Manager.txWeb3);
    const executorContract = new txWeb3.eth.Contract(arbitrageExecutorABI, executor);

    const protocols = [
      ETH_NETWORK_CONFIG.contracts.balancerExchangeProxy,
      ETH_NETWORK_CONFIG.contracts.uniswapRouter,
    ];

    const promiEvent = executorContract.methods
      .approve(tokens, protocols)
      .send({ from: fromAddress });

    this.transactionsApi.pushToSubmittedTransactions$('arbitrage.approveTokens', promiEvent, {
      address: fromAddress,
      executor,
      protocols,
      tokens,
    });

    await promiEvent;
  }

  @autobind
  public async swap(
    privateKey: string,
    executor: string,
    from: ProtocolTerms,
    to: ProtocolTerms,
  ): Promise<void> {
    const txWeb3 = getCurrentValueOrThrow(this.web3Manager.txWeb3);
    const account = txWeb3.eth.accounts.privateKeyToAccount(privateKey);

    const { tx, transactionObject } = this.getSwapTransaction(executor, from, to);
    const { gasPrice, gas } = await calcGas(transactionObject, account.address, txWeb3);
    const signed = await account.signTransaction({ ...tx, gasPrice, gas });

    const promiEvent = txWeb3.eth.sendSignedTransaction(signed.rawTransaction);

    this.transactionsApi.pushToSubmittedTransactions$('arbitrage.swap', promiEvent, {
      executor,
      from,
      to,
    });

    await promiEvent;
  }

  private getSwapTransaction(executor: string, from: ProtocolTerms, to: ProtocolTerms) {
    const { web3 } = this.web3Manager;

    const protocolAddresses: Record<Protocol, string> = {
      balancer: ETH_NETWORK_CONFIG.contracts.balancerExchangeProxy,
      'uniswap-v2': ETH_NETWORK_CONFIG.contracts.uniswapRouter,
    };

    const protocolABIs: Record<Protocol, {}> = {
      balancer: batchSwapExactInABI,
      'uniswap-v2': swapExactTokensForTokensABI,
    };

    const fromData = web3.eth.abi.encodeFunctionCall(protocolABIs[from.type], from.args);
    const toData = web3.eth.abi.encodeFunctionCall(protocolABIs[to.type], to.args);
    const data = web3.eth.abi.encodeParameters(
      ['address', 'bytes', 'address', 'bytes'],
      [protocolAddresses[from.type], fromData, protocolAddresses[to.type], toData],
    );

    return this.flashLoanApi.getExecuteLoanTransaction(executor, from.amountIn, data);
  }

  @memoize((args: {}) => Object.values(args).join())
  @autobind
  public getSwapTerms$(request: SwapTermsRequest): Observable<SwapTerms> {
    const {
      amountIn,
      protocolFrom,
      protocolTo,
      tokenFrom,
      tokenTo,
      additionalSlippageFrom,
      additionalSlippageTo,
      executorAddress,
    } = request;

    return combineLatest([
      this.flashLoanApi.getLoanFee$(amountIn),
      this.tokensApi.getErc20TokenInfo$(tokenFrom),
      this.tokensApi.getErc20TokenInfo$(tokenTo),
    ]).pipe(
      switchMap(([flashLoanFee, tokenFromInfo, tokenToInfo]) =>
        timer(0, 5 * 1000).pipe(
          switchMap(async () => {
            const fromTerms = await termsGetterByProtocol[protocolFrom]({
              amountIn,
              tokenFrom,
              tokenTo,
              tokenFromDecimals: tokenFromInfo.decimals,
              tokenToDecimals: tokenToInfo.decimals,
              additionalSlippage: additionalSlippageFrom,
              web3: this.web3Manager.web3,
              executorAddress,
            });
            return { fromTerms };
          }),
          switchMap(async ({ fromTerms }) => {
            if (!fromTerms) {
              return {};
            }

            const toTerms = await termsGetterByProtocol[protocolTo]({
              amountIn: fromTerms.minAmountOut, // TODO add balance from ArbitrageExecutor
              tokenFrom: tokenTo,
              tokenTo: tokenFrom,
              tokenFromDecimals: tokenToInfo.decimals,
              tokenToDecimals: tokenFromInfo.decimals,
              additionalSlippage: additionalSlippageTo,
              web3: this.web3Manager.web3,
              executorAddress,
            });

            return {
              fromTerms,
              toTerms,
            };
          }),
          switchMap(
            async ({ fromTerms, toTerms }): Promise<SwapTerms> => {
              if (!fromTerms || !toTerms) {
                return {
                  request,
                  from: fromTerms || null,
                  to: null,
                  summary: null,
                };
              }

              const gasCost = await this.calcGasCost(executorAddress, fromTerms, toTerms);

              const terms: SwapTerms = {
                request,
                from: fromTerms,
                to: toTerms,
                summary: {
                  earn: new BN(toTerms.minAmountOut)
                    .sub(new BN(amountIn))
                    .sub(flashLoanFee)
                    .sub(gasCost),
                  minAmountOut: new BN(toTerms.minAmountOut),
                  flashLoanFee,
                  gasPrice: gasCost,
                },
              };

              return terms;
            },
          ),
        ),
      ),
    );
  }

  private async calcGasCost(
    executorAddress: string,
    fromTerms: ProtocolTermsGeneric<Protocol, any>,
    toTerms: ProtocolTermsGeneric<Protocol, any>,
  ) {
    const txWeb3 = getCurrentValueOrThrow(this.web3Manager.txWeb3);

    const { transactionObject } = this.getSwapTransaction(executorAddress, fromTerms, toTerms);
    const [{ gasPrice, gas }, ethPrice] = await Promise.all([
      calcGas(transactionObject, executorAddress, txWeb3),
      getEthereumPrice(),
    ]);

    const gasCost = new BN(gasPrice)
      .mul(new BN(gas))
      .mul(new BN(ethPrice * 100))
      .divn(100);

    return gasCost;
  }
}

async function getEthereumPrice(): Promise<number> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
  );
  const json: {
    ethereum?: {
      usd?: number;
    };
  } = await response.json();
  const price = json?.ethereum?.usd || 0;

  return price;
}

async function calcGas(transactionObject: TransactionObject<any>, from: string, web3: Web3) {
  try {
    const estimatedGas = await transactionObject.estimateGas({ from });
    const gas = Math.ceil(estimatedGas * 1.1); // add 10%
    const gasPrice = await web3.eth.getGasPrice();
    return { gasPrice, gas };
  } catch (error) {
    return { gasPrice: 0, gas: 0 };
  }
}

const batchSwapExactInABI = {
  constant: false,
  inputs: [
    {
      components: [
        {
          internalType: 'address',
          name: 'pool',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'tokenInParam',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'tokenOutParam',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'maxPrice',
          type: 'uint256',
        },
      ],
      internalType: 'struct ExchangeProxy.Swap[]',
      name: 'swaps',
      type: 'tuple[]',
    },
    {
      internalType: 'address',
      name: 'tokenIn',
      type: 'address',
    },
    {
      internalType: 'address',
      name: 'tokenOut',
      type: 'address',
    },
    {
      internalType: 'uint256',
      name: 'totalAmountIn',
      type: 'uint256',
    },
    {
      internalType: 'uint256',
      name: 'minTotalAmountOut',
      type: 'uint256',
    },
  ],
  name: 'batchSwapExactIn',
  outputs: [
    {
      internalType: 'uint256',
      name: 'totalAmountOut',
      type: 'uint256',
    },
  ],
  payable: false,
  stateMutability: 'nonpayable',
  type: 'function',
};

const swapExactTokensForTokensABI = {
  inputs: [
    {
      internalType: 'uint256',
      name: 'amountIn',
      type: 'uint256',
    },
    {
      internalType: 'uint256',
      name: 'amountOutMin',
      type: 'uint256',
    },
    {
      internalType: 'address[]',
      name: 'path',
      type: 'address[]',
    },
    {
      internalType: 'address',
      name: 'to',
      type: 'address',
    },
    {
      internalType: 'uint256',
      name: 'deadline',
      type: 'uint256',
    },
  ],
  name: 'swapExactTokensForTokens',
  outputs: [
    {
      internalType: 'uint256[]',
      name: 'amounts',
      type: 'uint256[]',
    },
  ],
  stateMutability: 'nonpayable',
  type: 'function',
};
