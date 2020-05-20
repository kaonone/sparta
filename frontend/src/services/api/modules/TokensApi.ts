import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import BN from 'bn.js';
import * as R from 'ramda';
import { autobind } from 'core-decorators';
import { EventEmitter } from 'web3/types';

import { memoize } from 'utils/decorators';
import { createErc20, createPToken } from 'generated/contracts';
import { Token, ITokenInfo } from 'model/types';
import { ETH_NETWORK_CONFIG } from 'env';

import { Contracts, Web3ManagerModule } from '../types';
import { TransactionsApi } from './TransactionsApi';

function getCurrentValueOrThrow<T>(subject: BehaviorSubject<T | null>): NonNullable<T> {
  const value = subject.getValue();

  if (value === null || value === undefined) {
    throw new Error('Subject is not contain non nullable value');
  }

  return value as NonNullable<T>;
}

export class TokensApi {
  private readonlyContracts: Pick<Contracts, 'dai' | 'ptk'>;
  private txContracts = new BehaviorSubject<null | Pick<Contracts, 'dai' | 'ptk'>>(null);
  private events: { forReloadPtkDistributionBalance: EventEmitter[] } | null = null;

  constructor(private web3Manager: Web3ManagerModule, private transactionsApi: TransactionsApi) {
    this.readonlyContracts = {
      dai: createErc20(this.web3Manager.web3, ETH_NETWORK_CONFIG.contracts.dai),
      ptk: createPToken(this.web3Manager.web3, ETH_NETWORK_CONFIG.contracts.ptk),
    };

    this.web3Manager.txWeb3
      .pipe(
        map(
          txWeb3 =>
            txWeb3 && {
              dai: createErc20(txWeb3, ETH_NETWORK_CONFIG.contracts.dai),
              ptk: createPToken(txWeb3, ETH_NETWORK_CONFIG.contracts.ptk),
            },
        ),
      )
      .subscribe(this.txContracts);
  }

  public setEvents(events: NonNullable<TokensApi['events']>) {
    this.events = events;
  }

  @autobind
  public async approveDai(fromAddress: string, spender: string, value: BN): Promise<void> {
    const txDai = getCurrentValueOrThrow(this.txContracts).dai;

    const promiEvent = txDai.methods.approve({ spender, amount: value }, { from: fromAddress });

    this.transactionsApi.pushToSubmittedTransactions$('dai.approve', promiEvent, {
      spender,
      fromAddress,
      value,
    });

    await promiEvent;
  }

  @memoize(R.identity)
  @autobind
  public getErc20TokenInfo$(tokenAddress: string): Observable<ITokenInfo> {
    const contract = createErc20(this.web3Manager.web3, tokenAddress);

    return combineLatest([contract.methods.symbol(), contract.methods.decimals()]).pipe(
      map(([tokenSymbol, decimals]) => ({ symbol: tokenSymbol, decimals: decimals.toNumber() })),
    );
  }

  @memoize(R.identity)
  @autobind
  public getTokenInfo$(token: Token): Observable<ITokenInfo> {
    return combineLatest([
      this.readonlyContracts[token].methods.symbol(),
      this.readonlyContracts[token].methods.decimals(),
    ]).pipe(
      map(([tokenSymbol, decimals]) => ({ symbol: tokenSymbol, decimals: decimals.toNumber() })),
    );
  }

  @memoize((...args: string[]) => args.join())
  @autobind
  public getBalance$(token: Token, address: string): Observable<BN> {
    return this.readonlyContracts[token].methods.balanceOf({ account: address }, [
      this.readonlyContracts[token].events.Transfer({ filter: { from: address } }),
      this.readonlyContracts[token].events.Transfer({ filter: { to: address } }),
    ]);
  }

  @memoize(R.identity)
  @autobind
  public getPtkDistributionBalance$(address: string): Observable<BN> {
    if (!this.events) {
      throw new Error('Events for reload not found');
    }
    return this.readonlyContracts.ptk.methods.distributionBalanceOf({ account: address }, [
      this.readonlyContracts.ptk.events.Transfer({ filter: { from: address } }),
      this.readonlyContracts.ptk.events.Transfer({ filter: { to: address } }),
      ...this.events.forReloadPtkDistributionBalance,
    ]);
  }

  @memoize(R.identity)
  @autobind
  public getTotalSupply$(token: Token): Observable<BN> {
    return this.readonlyContracts[token].methods.totalSupply(
      undefined,
      this.readonlyContracts[token].events.Transfer(),
    );
  }

  @autobind
  public async withdrawUnclaimedDistributions(fromAddress: string): Promise<void> {
    const txContracts = getCurrentValueOrThrow(this.txContracts);

    const promiEvent = txContracts.ptk.methods.claimDistributions(
      {
        account: fromAddress,
      },
      { from: fromAddress },
    );

    this.transactionsApi.pushToSubmittedTransactions$('ptk.claimDistributions', promiEvent, {
      fromAddress,
    });

    await promiEvent;
  }

  @memoize(R.identity)
  @autobind
  public getUnclaimedDistributions$(account: string): Observable<BN> {
    return this.readonlyContracts.ptk.methods.calculateUnclaimedDistributions({ account }, [
      this.readonlyContracts.ptk.events.DistributionCreated(),
      this.readonlyContracts.ptk.events.DistributionsClaimed({ filter: { account } }),
    ]);
  }

  @memoize(R.identity)
  @autobind
  public getAccumulatedUserDistributions$(account: string): Observable<BN> {
    return combineLatest([
      this.getAccumulatedPoolDistributions$(),
      this.getDistributionTotalSupply$(),
      this.getDistributionBalanceOf$(account),
    ]).pipe(
      map(([pool, totalSupply, balance]) =>
        totalSupply.isZero() ? totalSupply : pool.mul(balance).div(totalSupply),
      ),
    );
  }

  @memoize()
  @autobind
  public getAccumulatedPoolDistributions$(): Observable<BN> {
    return this.readonlyContracts.ptk.methods.distributionAccumulator(undefined, [
      this.readonlyContracts.ptk.events.DistributionAccumulatorIncreased(),
      this.readonlyContracts.ptk.events.DistributionCreated(),
    ]);
  }

  @memoize(R.identity)
  @autobind
  public getDistributionBalanceOf$(account: string): Observable<BN> {
    return this.readonlyContracts.ptk.methods.distributionBalanceOf({ account }, [
      this.readonlyContracts.ptk.events.Transfer({ filter: { from: account } }),
      this.readonlyContracts.ptk.events.Transfer({ filter: { to: account } }),
    ]);
  }

  @memoize()
  @autobind
  public getDistributionTotalSupply$(): Observable<BN> {
    return this.readonlyContracts.ptk.methods.distributionTotalSupply(
      undefined,
      this.readonlyContracts.ptk.events.Transfer(),
    );
  }

  @memoize()
  @autobind
  public getNextDistributionTimestamp$(): Observable<number> {
    return this.readonlyContracts.ptk.methods
      .nextDistributionTimestamp(undefined, this.readonlyContracts.ptk.events.DistributionCreated())
      .pipe(map(item => item.toNumber()));
  }
}
