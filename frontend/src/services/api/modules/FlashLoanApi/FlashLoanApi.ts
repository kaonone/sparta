import { Observable, of, timer } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { autobind } from 'core-decorators';
import BN from 'bn.js';

import { memoize } from 'utils/decorators';
import { zeroAddress } from 'utils/mock';

import { Web3ManagerModule } from '../../types';
import { getBalancerTerms } from './getBalancerTerms';
import { getUniswapTerms } from './getUniswapTerms';
import { Address, SwapTerms, Protocol, GetTermsFunction } from './types';

const termsGetterByProtocol: Record<Protocol, GetTermsFunction> = {
  'uniswap-v2': getUniswapTerms,
  balancer: getBalancerTerms,
};

export class FlashLoanApi {
  constructor(private web3Manager: Web3ManagerModule) {}

  @memoize()
  @autobind
  // eslint-disable-next-line class-methods-use-this
  public getStrategyAddress$(): Observable<string | null> {
    return of(zeroAddress);
  }

  @memoize((args: {}) => Object.values(args).join())
  @autobind
  public getSwapTerms$({
    amountIn,
    protocolFrom,
    protocolTo,
    tokenFrom,
    tokenTo,
    additionalSlippageFrom,
    additionalSlippageTo,
  }: {
    amountIn: string;
    protocolFrom: Protocol;
    protocolTo: Protocol;
    tokenFrom: Address;
    tokenTo: Address;
    additionalSlippageFrom: number;
    additionalSlippageTo: number;
  }): Observable<SwapTerms> {
    return timer(0, 5 * 1000).pipe(
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
          amountIn: fromTerms.minAmountOut,
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
              amountIn,
              earn: null,
              flashLoanFee: null,
              from: fromTerms || null,
              gasPrice: null,
              minAmountOut: null,
              to: null,
            };
          }

          return {
            amountIn,
            earn: new BN(amountIn).sub(new BN(toTerms.minAmountOut)),
            minAmountOut: new BN(toTerms.minAmountOut),
            flashLoanFee: new BN(0), // TODO
            from: fromTerms,
            to: toTerms,
            gasPrice: new BN(0), // TODO
          };
        },
      ),
    );
  }
}
