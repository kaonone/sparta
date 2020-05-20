import { Observable, of, timer, BehaviorSubject } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { autobind } from 'core-decorators';
import BN from 'bn.js';

import { memoize } from 'utils/decorators';
import { zeroAddress } from 'utils/mock';
import { createArbitrageModule } from 'generated/contracts';
import { ETH_NETWORK_CONFIG } from 'env';
import { SwapTerms, Protocol, SwapTermsRequest } from 'model/types';

import { Web3ManagerModule, Contracts } from '../../types';
import { getBalancerTerms } from './getBalancerTerms';
import { getUniswapTerms } from './getUniswapTerms';
import { GetTermsFunction } from './types';
import { TransactionsApi } from '../TransactionsApi';
import { FlashLoanModuleApi } from '../FlashLoanModuleApi';

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

  @memoize()
  @autobind
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  public getExecutorAddress$(_account: string): Observable<string | null> {
    return of(zeroAddress);
    // return of(null);

    // TODO uncomment
    // return this.readonlyContract.methods.executors(
    //   { '': account },
    //   this.readonlyContract.events.ExecutorCreated({ filter: { beneficiary: account } }),
    // );
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
    } = request;

    return this.flashLoanApi.getLoanFee$(amountIn).pipe(
      switchMap(flashLoanFee =>
        timer(0, 5 * 1000).pipe(
          switchMap(async () => {
            const fromTerms = await termsGetterByProtocol[protocolFrom]({
              amountIn,
              tokenFrom,
              tokenTo,
              additionalSlippage: additionalSlippageFrom,
              web3: this.web3Manager.web3,
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
              additionalSlippage: additionalSlippageTo,
              web3: this.web3Manager.web3,
            });

            return {
              fromTerms,
              toTerms,
            };
          }),
          map(
            ({ fromTerms, toTerms }): SwapTerms => {
              if (!fromTerms || !toTerms) {
                return {
                  request,
                  from: fromTerms || null,
                  to: null,
                  summary: null,
                };
              }

              const terms: SwapTerms = {
                request,
                from: fromTerms,
                to: toTerms,
                summary: {
                  earn: new BN(toTerms.minAmountOut).sub(new BN(amountIn)).sub(flashLoanFee),
                  minAmountOut: new BN(toTerms.minAmountOut),
                  flashLoanFee,
                  gasPrice: new BN(0), // TODO
                },
              };

              return terms;
            },
          ),
        ),
      ),
    );
  }
}
