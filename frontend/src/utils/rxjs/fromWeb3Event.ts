import { fromEventPattern, Observable } from 'rxjs';
import { EventEmitter, EventLog } from 'web3/types';

export function fromWeb3Event(
  emitter: EventEmitter,
  type: 'error' | 'data' | 'changed',
): Observable<EventLog> {
  interface IUnsubscribable {
    unsubscribe: () => void;
  }

  return fromEventPattern<EventLog>(
    handler => emitter.on(type, handler),
    (_, signal: IUnsubscribable) => signal.unsubscribe(),
  );
}
