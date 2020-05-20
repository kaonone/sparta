import { Observable, of } from 'rxjs';
import BN from 'bn.js';
import { autobind } from 'core-decorators';

import { memoize } from 'utils/decorators';
import { createFlashLoanModule } from 'generated/contracts';
import { ETH_NETWORK_CONFIG } from 'env';

import { Contracts, Web3ManagerModule } from '../types';

export class FlashLoanModuleApi {
  private readonlyContract: Contracts['flashLoanModule'];

  constructor(private web3Manager: Web3ManagerModule) {
    this.readonlyContract = createFlashLoanModule(
      this.web3Manager.web3,
      ETH_NETWORK_CONFIG.contracts.flashLoanModule,
    );
  }

  @memoize()
  @autobind
  // eslint-disable-next-line class-methods-use-this
  public getLoanFee$(amount: string): Observable<BN> {
    return of(new BN(amount).muln(5).divn(100));

    // TODO uncomment
    // return this.readonlyContract.methods.getLoanFee(
    //   { amount: new BN(amount) },
    //   this.readonlyContract.events.FeeChanged(),
    // );
  }
}
