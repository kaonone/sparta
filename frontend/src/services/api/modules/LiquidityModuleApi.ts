import { Observable, BehaviorSubject, timer, combineLatest } from 'rxjs';
import { first as firstOperator, switchMap, map } from 'rxjs/operators';
import BN from 'bn.js';
import { autobind } from 'core-decorators';
import * as R from 'ramda';

import { min } from 'utils/bn';
import { ETH_NETWORK_CONFIG } from 'env';
import { createLiquidityModule } from 'generated/contracts';
import { memoize } from 'utils/decorators';
import { calcTotalWithdrawAmountByUserWithdrawAmount } from 'model';
import { zeroAddress } from 'utils/mock';

import { Contracts, Web3ManagerModule } from '../types';
import { TokensApi } from './TokensApi';
import { TransactionsApi } from './TransactionsApi';
import { FundsModuleApi } from './FundsModuleApi';
import { CurveModuleApi } from './CurveModuleApi';

function getCurrentValueOrThrow<T>(subject: BehaviorSubject<T | null>): NonNullable<T> {
  const value = subject.getValue();

  if (value === null || value === undefined) {
    throw new Error('Subject is not contain non nullable value');
  }

  return value as NonNullable<T>;
}

function first<T>(input: Observable<T>): Promise<T> {
  return input.pipe(firstOperator()).toPromise();
}

export class LiquidityModuleApi {
  private readonlyContract: Contracts['liquidityModule'];
  private txContract = new BehaviorSubject<null | Contracts['liquidityModule']>(null);

  constructor(
    private web3Manager: Web3ManagerModule,
    private tokensApi: TokensApi,
    private transactionsApi: TransactionsApi,
    private fundsModuleApi: FundsModuleApi,
    private curveModuleApi: CurveModuleApi,
  ) {
    this.readonlyContract = createLiquidityModule(
      web3Manager.web3,
      ETH_NETWORK_CONFIG.contracts.liquidityModule,
    );

    this.web3Manager.txWeb3
      .pipe(
        map(
          txWeb3 =>
            txWeb3 && createLiquidityModule(txWeb3, ETH_NETWORK_CONFIG.contracts.liquidityModule),
        ),
      )
      .subscribe(this.txContract);
  }

  @memoize()
  @autobind
  public getConfig$(): Observable<{ lDepositMin: BN; pWithdrawMin: BN }> {
    return this.readonlyContract.methods.limits().pipe(
      map(([lDepositMin, pWithdrawMin]) => ({
        lDepositMin,
        pWithdrawMin,
      })),
    );
  }

  @memoize(R.identity)
  @autobind
  public getWithdrawLimitInDai$(account: string) {
    return this.getWithdrawLimit$(account).pipe(
      switchMap(value => this.fundsModuleApi.getPtkToDaiExitInfo$(value.toString())),
    );
  }

  @memoize(R.identity)
  @autobind
  public getWithdrawLimit$(account: string): Observable<BN> {
    const updatingIntervalInMs = 60 * 60 * 1000;
    return timer(0, updatingIntervalInMs).pipe(
      switchMap(() =>
        this.readonlyContract.methods.withdrawLimit({ user: account }, [
          this.readonlyContract.events.Withdraw(),
          this.readonlyContract.events.Deposit(),
        ]),
      ),
    );
  }

  @memoize(R.identity)
  @autobind
  public getPreliminaryExitInfo$(account: string): Observable<{ exitBalance: BN; exitLose: BN }> {
    return combineLatest([
      this.getExitBalance$(account || zeroAddress).pipe(
        switchMap(exitBalance => this.fundsModuleApi.getPtkToDaiExitInfo$(exitBalance.toString())),
      ),
      this.fundsModuleApi.getMaxWithdrawAmountInDai$(account || zeroAddress),
    ]).pipe(
      map(([exitBalance, maxWithdraw]) => ({
        exitBalance: exitBalance.user,
        exitLose: maxWithdraw.sub(exitBalance.user),
      })),
    );
  }

  @memoize(R.identity)
  @autobind
  public getExitBalance$(account: string): Observable<BN> {
    const updatingIntervalInMs = 60 * 60 * 1000;
    return timer(0, updatingIntervalInMs).pipe(
      switchMap(() =>
        this.readonlyContract.methods.pRefund({ user: account }, [
          this.readonlyContract.events.Withdraw(),
          this.readonlyContract.events.Deposit(),
          this.readonlyContract.events.PlanClosed(),
        ]),
      ),
    );
  }

  @memoize(R.identity)
  @autobind
  public isWithdrawPeriod$(account: string): Observable<boolean> {
    const updatingIntervalInMs = 60 * 60 * 1000;
    return timer(0, updatingIntervalInMs).pipe(
      switchMap(() => this.getWithdrawPeriodDate$(account)),
      map(withdrawPeriodDate => {
        if (!withdrawPeriodDate) {
          return false;
        }

        return new BN(Date.now()).gt(withdrawPeriodDate);
      }),
    );
  }

  @memoize(R.identity)
  @autobind
  public getWithdrawPeriodDate$(account: string): Observable<BN | null> {
    return combineLatest([this.getPlan$(account), this.getPlanSettings$()]).pipe(
      map(([plan, planSettings]) => {
        if (!plan) {
          return null;
        }

        const withdrawPeriodDate = plan.created.add(planSettings.depositPeriodDuration).muln(1000);

        return withdrawPeriodDate;
      }),
    );
  }

  @memoize(R.identity)
  @autobind
  public getPlan$(account: string): Observable<{ created: BN; pWithdrawn: BN } | null> {
    return this.readonlyContract.methods
      .plans({ '': account }, [
        this.readonlyContract.events.PlanCreated(),
        this.readonlyContract.events.PlanClosed(),
      ])
      .pipe(map(([created, pWithdrawn]) => (created.isZero() ? null : { created, pWithdrawn })));
  }

  @memoize()
  @autobind
  public getPlanSettings$() {
    return this.readonlyContract.methods
      .planSettings(undefined, this.readonlyContract.events.PlanSettingsChanged())
      .pipe(
        map(
          ([
            depositPeriodDuration,
            minPenalty,
            maxPenalty,
            withdrawPeriodDuration,
            initialWithdrawAllowance,
          ]) => ({
            depositPeriodDuration,
            minPenalty,
            maxPenalty,
            withdrawPeriodDuration,
            initialWithdrawAllowance,
          }),
        ),
      );
  }

  @autobind
  public async sellPtk(fromAddress: string, values: { sourceAmount: BN }): Promise<void> {
    const { sourceAmount: lAmountWithoutFee } = values;
    const txLiquidityModule = getCurrentValueOrThrow(this.txContract);

    const { percentDivider, withdrawFeePercent } = await first(this.curveModuleApi.getConfig$());
    const lAmountWithFee = calcTotalWithdrawAmountByUserWithdrawAmount({
      userWithdrawAmountInDai: lAmountWithoutFee,
      percentDivider,
      withdrawFeePercent,
    });

    const pAmountWithFee = await first(
      this.fundsModuleApi.convertDaiToPtkExit$(lAmountWithFee.toString()),
    );
    const pBalance = await first(this.tokensApi.getBalance$('ptk', fromAddress));

    const promiEvent = txLiquidityModule.methods.withdraw(
      { lAmountMin: new BN(0), pAmount: min(pAmountWithFee, pBalance) },
      { from: fromAddress },
    );

    this.transactionsApi.pushToSubmittedTransactions$('liquidity.sellPtk', promiEvent, {
      address: fromAddress,
      ...values,
    });

    await promiEvent;
  }

  @autobind
  public async buyPtk(fromAddress: string, values: { sourceAmount: BN }): Promise<void> {
    const { sourceAmount } = values;
    const txLiquidityModule = getCurrentValueOrThrow(this.txContract);

    await this.tokensApi.approveDai(
      fromAddress,
      ETH_NETWORK_CONFIG.contracts.fundsModule,
      sourceAmount,
    );

    const promiEvent = txLiquidityModule.methods.deposit(
      { lAmount: sourceAmount, pAmountMin: new BN(0) },
      { from: fromAddress },
    );

    this.transactionsApi.pushToSubmittedTransactions$('liquidity.buyPtk', promiEvent, {
      address: fromAddress,
      ...values,
    });

    await promiEvent;
  }

  @autobind
  public async closePlan(fromAddress: string): Promise<void> {
    const txLiquidityModule = getCurrentValueOrThrow(this.txContract);

    const promiEvent = txLiquidityModule.methods.closePlan(
      { lAmountMin: new BN(0) },
      { from: fromAddress },
    );

    this.transactionsApi.pushToSubmittedTransactions$('liquidity.closePlan', promiEvent, {
      address: fromAddress,
    });

    await promiEvent;
  }
}
