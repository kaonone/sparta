import { Observable, BehaviorSubject } from 'rxjs';
import BN from 'bn.js';
import { autobind } from 'core-decorators';
import { map } from 'rxjs/operators';
import { Tx } from 'web3/eth/types';
import * as R from 'ramda';

import { memoize } from 'utils/decorators';
import flashLoanABI from 'utils/abi/flashLoanModule.json';
import { createFlashLoanModule } from 'generated/contracts';
import { ETH_NETWORK_CONFIG } from 'env';

import { Contracts, Web3ManagerModule } from '../types';

function getCurrentValueOrThrow<T>(subject: BehaviorSubject<T | null>): NonNullable<T> {
  const value = subject.getValue();

  if (value === null || value === undefined) {
    throw new Error('Subject is not contain non nullable value');
  }

  return value as NonNullable<T>;
}

export class FlashLoanModuleApi {
  private readonlyContract: Contracts['flashLoanModule'];
  private txContract = new BehaviorSubject<null | Contracts['flashLoanModule']>(null);

  constructor(private web3Manager: Web3ManagerModule) {
    this.readonlyContract = createFlashLoanModule(
      this.web3Manager.web3,
      ETH_NETWORK_CONFIG.contracts.flashLoanModule,
    );

    this.web3Manager.txWeb3
      .pipe(
        map(
          txWeb3 =>
            txWeb3 && createFlashLoanModule(txWeb3, ETH_NETWORK_CONFIG.contracts.flashLoanModule),
        ),
      )
      .subscribe(this.txContract);
  }

  @memoize(R.identity)
  @autobind
  // eslint-disable-next-line class-methods-use-this
  public getLoanFee$(amount: string): Observable<BN> {
    return this.readonlyContract.methods.getLoanFee(
      { amount: new BN(amount) },
      this.readonlyContract.events.FeeChanged(),
    );
  }

  @autobind
  public getExecuteLoanTransaction(executor: string, amount: string, data: string) {
    const txWeb3 = getCurrentValueOrThrow(this.web3Manager.txWeb3);
    const contract = new txWeb3.eth.Contract(
      flashLoanABI,
      ETH_NETWORK_CONFIG.contracts.flashLoanModule,
    );

    const args = [executor, amount, data];
    const tx: Tx = {
      to: ETH_NETWORK_CONFIG.contracts.flashLoanModule,
      data: txWeb3.eth.abi.encodeFunctionCall(executeLoanABI, args),
    };

    return {
      transactionObject: contract.methods.executeLoan(...args),
      tx,
    };
  }
}

const executeLoanABI = {
  constant: false,
  inputs: [
    {
      internalType: 'contract IFlashLoanReceiver',
      name: 'receiver',
      type: 'address',
    },
    {
      internalType: 'uint256',
      name: 'amount',
      type: 'uint256',
    },
    {
      internalType: 'bytes',
      name: 'data',
      type: 'bytes',
    },
  ],
  name: 'executeLoan',
  outputs: [],
  payable: false,
  stateMutability: 'nonpayable',
  type: 'function',
};
