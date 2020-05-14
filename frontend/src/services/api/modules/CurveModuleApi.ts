import { Observable, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import BN from 'bn.js';
import { autobind } from 'core-decorators';

import { memoize } from 'utils/decorators';
import { createCurveModule } from 'generated/contracts';
import { ETH_NETWORK_CONFIG } from 'env';

import { Contracts, Web3ManagerModule } from '../types';

export class CurveModuleApi {
  private readonlyContract: Contracts['curveModule'];

  constructor(private web3Manager: Web3ManagerModule) {
    this.readonlyContract = createCurveModule(
      this.web3Manager.web3,
      ETH_NETWORK_CONFIG.contracts.curveModule,
    );
  }

  @memoize()
  @autobind
  public getConfig$(): Observable<{
    curveA: BN;
    curveB: BN;
    withdrawFeePercent: BN;
    percentDivider: BN;
  }> {
    return combineLatest([
      this.readonlyContract.methods.curveA(),
      this.readonlyContract.methods.curveB(),
      this.readonlyContract.methods.withdrawFeePercent(),
      this.readonlyContract.methods.PERCENT_DIVIDER(),
    ]).pipe(
      map(([curveA, curveB, withdrawFeePercent, percentDivider]) => ({
        curveA,
        curveB,
        withdrawFeePercent,
        percentDivider,
      })),
    );
  }

  @memoize((...args: string[]) => args.join())
  @autobind
  public calculateExitInverse$(
    liquidAssets: string,
    pAmount: string,
  ): Observable<{ total: BN; user: BN; fee: BN }> {
    const pAmountBN = new BN(pAmount);
    return pAmountBN.isZero()
      ? of({ total: pAmountBN, user: pAmountBN, fee: pAmountBN })
      : this.readonlyContract.methods
          .calculateExitInverseWithFee({ liquidAssets: new BN(liquidAssets), pAmount: pAmountBN })
          .pipe(
            map(([total, user, fee]) => ({
              total,
              user,
              fee,
            })),
          );
  }
}
