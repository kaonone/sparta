import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import BN from 'bn.js';
import { autobind } from 'core-decorators';
import * as R from 'ramda';

import { ETH_NETWORK_CONFIG } from 'env';
import { createDeFiModule } from 'generated/contracts';
import { memoize } from 'utils/decorators';

import { Contracts, Web3ManagerModule } from '../types';
import { TransactionsApi } from './TransactionsApi';

function getCurrentValueOrThrow<T>(subject: BehaviorSubject<T | null>): NonNullable<T> {
  const value = subject.getValue();

  if (value === null || value === undefined) {
    throw new Error('Subject is not contain non nullable value');
  }

  return value as NonNullable<T>;
}

export class DefiModuleApi {
  private readonlyContract: Contracts['defiModule'];
  private txContract = new BehaviorSubject<null | Contracts['defiModule']>(null);

  constructor(private web3Manager: Web3ManagerModule, private transactionsApi: TransactionsApi) {
    this.readonlyContract = createDeFiModule(
      web3Manager.web3,
      ETH_NETWORK_CONFIG.contracts.defiModule,
    );

    this.web3Manager.txWeb3
      .pipe(
        map(txWeb3 => txWeb3 && createDeFiModule(txWeb3, ETH_NETWORK_CONFIG.contracts.defiModule)),
      )
      .subscribe(this.txContract);
  }

  @memoize(R.identity)
  @autobind
  public getAvailableInterest$(account: string): Observable<BN> {
    return this.readonlyContract.methods.availableInterest({ account }, [
      this.readonlyContract.events.InvestmentDistributionCreated(),
      this.readonlyContract.events.WithdrawInterest({ filter: { account } }),
    ]);
  }

  @autobind
  public async withdrawInterest(fromAddress: string): Promise<void> {
    const txModule = getCurrentValueOrThrow(this.txContract);

    const promiEvent = txModule.methods.withdrawInterest(undefined, { from: fromAddress });

    this.transactionsApi.pushToSubmittedTransactions$('defi.withdrawInterest', promiEvent, {
      address: fromAddress,
    });

    await promiEvent;
  }
}
