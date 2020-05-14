import { ReplaySubject } from 'rxjs';
import PromiEvent from 'web3/promiEvent';
import { autobind } from 'core-decorators';

import {
  SubmittedTransaction,
  SubmittedTransactionType,
  ExtractSubmittedTransaction,
} from '../types';

export class TransactionsApi {
  private submittedTransaction = new ReplaySubject<SubmittedTransaction>();

  @autobind
  public getSubmittedTransaction$() {
    return this.submittedTransaction;
  }

  public pushToSubmittedTransactions$<T extends SubmittedTransactionType>(
    transactionName: T,
    promiEvent: PromiEvent<any>,
    payload: ExtractSubmittedTransaction<T>['payload'],
  ) {
    const promise = new Promise<string>(resolve =>
      promiEvent.on('transactionHash', tx => resolve(tx)),
    );

    this.submittedTransaction.next({
      type: transactionName as 'dai.approve',
      tx: promise,
      promiEvent,
      payload,
    });
  }
}
