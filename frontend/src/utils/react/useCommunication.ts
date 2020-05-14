import { useCallback, useState, useRef, useEffect } from 'react';
import { Object, B } from 'ts-toolbelt';

import { makeCancelablePromise, CancelablePromise } from 'utils/makeCancelablePromise';
import { getErrorMsg } from 'utils/getErrorMsg';

type Status = 'initial' | 'pending' | 'success' | 'error' | 'canceled';

export type Communication<E, O extends IOptions<E>> = CommunicationState<E, O> &
  CommunicationHandlers<E>;

export interface CommunicationState<E, O extends IOptions<E>> {
  error: string | null;
  status: Status;
  result: InferResult<E> | (Object.Has<O, 'defaultResult'> extends B.True ? never : undefined);
}

export interface CommunicationHandlers<E> {
  execute(...args: InferArgs<E>): void;
  cancelRequest(): void;
  reset(): void;
}

type InferResult<E> = E extends (...args: any[]) => Promise<infer R> ? R : never;
type InferArgs<E> = E extends (...args: infer A) => Promise<any> ? A : never;

interface IOptions<E> {
  defaultResult?: InferResult<E>;
  resetStateOnExecute?: boolean;
}

export function useCommunication<
  E extends (...args: any[]) => Promise<any>,
  O extends IOptions<E> = {}
>(effect: E, inputs: any[], options?: O): Communication<E, O> {
  const { defaultResult, resetStateOnExecute } = options || {};
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('initial');
  const [result, setResult] = useState<InferResult<E> | undefined>(defaultResult);

  const launchedCommunicationRef = useRef<CancelablePromise<InferResult<E>> | null>(null);

  const cancelRequest = useCallback((setStatusCanceled: boolean = true) => {
    launchedCommunicationRef.current && launchedCommunicationRef.current.cancel();
    setStatusCanceled && setStatus('canceled');
  }, []);

  useEffect(() => () => cancelRequest(false), []);

  const reset = useCallback(() => {
    cancelRequest(false);
    setStatus('initial');
    setError(null);
    setResult(defaultResult);
    launchedCommunicationRef.current = null;
  }, []);

  const execute = useCallback(
    (...args: InferArgs<E>) => {
      resetStateOnExecute !== false && reset();
      setStatus('pending');

      const communication = makeCancelablePromise<InferResult<E>>(effect(...args));
      launchedCommunicationRef.current = communication;

      communication
        .then(res => {
          setResult(res);
          setStatus('success');
        })
        .catch(err => {
          if (err.isCanceled) {
            return;
          }
          setError(getErrorMsg(err));
          setStatus('error');
        });
    },
    [...inputs, effect],
  );

  return {
    execute,
    cancelRequest,
    reset,
    status,
    error,
    result: result as CommunicationState<E, O>['result'],
  };
}
