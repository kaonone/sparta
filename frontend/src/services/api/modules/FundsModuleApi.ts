import { Observable, combineLatest, BehaviorSubject, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import BN from 'bn.js';
import * as R from 'ramda';
import { autobind } from 'core-decorators';

import { memoize } from 'utils/decorators';
import { createFundsModule } from 'generated/contracts';
import { ETH_NETWORK_CONFIG } from 'env';
import { decimalsToWei, max } from 'utils/bn';
import { calcTotalWithdrawAmountByUserWithdrawAmount } from 'model';

import { TokensApi } from './TokensApi';
import { CurveModuleApi } from './CurveModuleApi';
import { Contracts, Web3ManagerModule } from '../types';

export class FundsModuleApi {
  private readonlyContract: Contracts['fundsModule'];
  private txContract = new BehaviorSubject<null | Contracts['fundsModule']>(null);
  private getTotalLProposals$: (() => Observable<BN>) | null = null;
  private getUnpaidInterest$: ((address: string) => Observable<BN>) | null = null;

  constructor(
    private web3Manager: Web3ManagerModule,
    private curveModuleApi: CurveModuleApi,
    private tokensApi: TokensApi,
  ) {
    this.readonlyContract = createFundsModule(
      this.web3Manager.web3,
      ETH_NETWORK_CONFIG.contracts.fundsModule,
    );

    this.web3Manager.txWeb3
      .pipe(
        map(
          txWeb3 => txWeb3 && createFundsModule(txWeb3, ETH_NETWORK_CONFIG.contracts.fundsModule),
        ),
      )
      .subscribe(this.txContract);
  }

  public setTotalLProposalGetter(getter: () => Observable<BN>) {
    this.getTotalLProposals$ = getter;
  }

  public setUnpaidInterestGetter(getter: (address: string) => Observable<BN>) {
    this.getUnpaidInterest$ = getter;
  }

  @memoize(R.identity)
  @autobind
  public getMaxWithdrawAmountInDai$(address: string): Observable<BN> {
    if (!this.getUnpaidInterest$) {
      throw new Error('Getter for unpaidInterest is not found');
    }

    return combineLatest([this.getUnpaidInterest$(address), this.curveModuleApi.getConfig$()]).pipe(
      switchMap(([unpaidInterestInDai, { percentDivider, withdrawFeePercent }]) =>
        this.convertDaiToPtkExit$(
          calcTotalWithdrawAmountByUserWithdrawAmount({
            percentDivider,
            withdrawFeePercent,
            userWithdrawAmountInDai: unpaidInterestInDai,
          }).toString(),
        ),
      ),
      switchMap(unpaidInterestInPtk =>
        this.getAvailableBalance$(address, unpaidInterestInPtk.muln(-1).toString()),
      ),
    );
  }

  @memoize(R.identity)
  @autobind
  public getUserWithdrawAmountInDai$(fullWithdrawAmountInPtk: string): Observable<BN> {
    return this.getPtkToDaiExitInfo$(fullWithdrawAmountInPtk).pipe(map(({ user }) => user));
  }

  @memoize(R.identity)
  @autobind
  public getPtkBalanceInDaiWithoutFee$(address: string): Observable<BN> {
    return this.tokensApi.getBalance$('ptk', address).pipe(
      switchMap(balance => this.getPtkToDaiExitInfo$(balance.toString())),
      map(item => item.total),
    );
  }

  @memoize(R.identity)
  @autobind
  public getPtkBalanceInDaiWithFee$(address: string): Observable<BN> {
    return this.tokensApi.getBalance$('ptk', address).pipe(
      switchMap(balance => this.getPtkToDaiExitInfo$(balance.toString())),
      map(item => item.user),
    );
  }

  @memoize(R.identity)
  @autobind
  public getDaiToDaiExitInfo$(daiValue: string): Observable<{ total: BN; user: BN; fee: BN }> {
    return this.convertDaiToPtkExit$(daiValue).pipe(
      switchMap(ptkValue => this.getPtkToDaiExitInfo$(ptkValue.toString())),
    );
  }

  @memoize(R.identity)
  @autobind
  // eslint-disable-next-line class-methods-use-this
  public convertPtkToDaiForLocked$(value: string): Observable<BN> {
    return combineLatest([
      this.tokensApi.getTokenInfo$('dai'),
      this.tokensApi.getTokenInfo$('ptk'),
    ]).pipe(
      switchMap(([daiInfo, ptkInfo]) =>
        this.convertDaiToPtkEnter$(decimalsToWei(daiInfo.decimals).toString()).pipe(
          map(oneDaiPrice => ({ oneDaiPrice, ptkInfo })),
        ),
      ),
      map(({ oneDaiPrice, ptkInfo }) =>
        new BN(value).mul(decimalsToWei(ptkInfo.decimals)).div(oneDaiPrice),
      ),
    );
  }

  @memoize(R.identity)
  @autobind
  public convertDaiToPtkEnter$(value: string): Observable<BN> {
    const lAmount = new BN(value);

    return lAmount.isZero()
      ? of(lAmount)
      : this.readonlyContract.methods.calculatePoolEnter(
          { lAmount, liquidityCorrection: new BN(0) },
          this.readonlyContract.events.Status(),
        );
  }

  @memoize(R.identity)
  @autobind
  public convertDaiToPtkExit$(value: string): Observable<BN> {
    const lAmount = new BN(value);

    return lAmount.isZero()
      ? of(lAmount)
      : this.readonlyContract.methods.calculatePoolExit(
          { lAmount },
          this.readonlyContract.events.Status(),
        );
  }

  @memoize(R.identity)
  @autobind
  public getPtkToDaiExitInfo$(value: string): Observable<{ total: BN; user: BN; fee: BN }> {
    const pAmount = new BN(value);

    return pAmount.isZero()
      ? of({ total: pAmount, user: pAmount, fee: pAmount })
      : this.readonlyContract.methods
          .calculatePoolExitInverse({ pAmount }, this.readonlyContract.events.Status())
          .pipe(
            map(([total, user, fee]) => ({
              total,
              user,
              fee,
            })),
          );
  }

  /**
   * Calculates current available balance of the user with optional corrections
   * @param address user address for getting current PTK balance
   * @param additionalPtkBalance how many tokens increase the balance
   * @param additionalLiquidity how much illiquid funds will be returned to liquidity
   */
  @memoize(R.identity)
  @autobind
  public getAvailableBalance$(
    address: string,
    additionalPtkBalance: string = '0',
    additionalLiquidity: string = '0',
  ): Observable<BN> {
    return combineLatest([
      this.tokensApi.getBalance$('ptk', address),
      this.getCurrentLiquidity$(),
    ]).pipe(
      switchMap(([ptkBalance, currentLiquidity]) =>
        this.curveModuleApi
          .calculateExitInverse$(
            currentLiquidity.add(new BN(additionalLiquidity)).toString(),
            max(new BN(0), ptkBalance.add(new BN(additionalPtkBalance))).toString(),
          )
          .pipe(map(info => info.user)),
      ),
    );
  }

  /**
   * Calculates how much the available balance of the user will increase after the return of illiquid funds
   * @param address user address for getting current PTK balance
   * @param additionalPtkBalance how many tokens increase the balance
   * @param additionalLiquidity how much illiquid funds will be returned to liquidity
   */
  @memoize(R.identity)
  @autobind
  public getAvailableBalanceIncreasing$(
    address: string,
    additionalPtkBalance: string,
    additionalLiquidity: string,
  ): Observable<BN> {
    return combineLatest([
      this.tokensApi.getBalance$('ptk', address),
      this.getCurrentLiquidity$(),
    ]).pipe(
      switchMap(([ptkBalance, currentLiquidity]) =>
        combineLatest([
          this.curveModuleApi.calculateExitInverse$(
            currentLiquidity.toString(),
            ptkBalance.toString(),
          ),
          this.curveModuleApi.calculateExitInverse$(
            currentLiquidity.add(new BN(additionalLiquidity)).toString(),
            ptkBalance.add(new BN(additionalPtkBalance)).toString(),
          ),
        ]).pipe(map(([currentInfo, increasedInfo]) => increasedInfo.user.sub(currentInfo.user))),
      ),
    );
  }

  @memoize()
  @autobind
  public getCurrentLiquidity$(): Observable<BN> {
    if (!this.getTotalLProposals$) {
      throw new Error('Getter for totalLProposals is not found');
    }

    return combineLatest([
      this.readonlyContract.methods.lBalance(undefined, this.readonlyContract.events.Status()),
      this.getTotalLProposals$(),
    ]).pipe(map(([liquidity, totalLProposals]) => liquidity.sub(totalLProposals)));
  }

  @memoize()
  @autobind
  public getFundsLBalance$(): Observable<BN> {
    return this.readonlyContract.methods.lBalance(undefined, this.readonlyContract.events.Status());
  }
}
