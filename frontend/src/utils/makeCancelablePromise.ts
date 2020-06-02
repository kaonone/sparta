export interface CancelablePromise<T> extends Promise<T> {
  cancel(): void;
}

export function makeCancelablePromise<T>(promise: Promise<T>): CancelablePromise<T> {
  let hasCanceled = false;

  const wrappedPromise: CancelablePromise<T> = new Promise<T>((resolve, reject) => {
    promise.then(
      val => (hasCanceled ? reject(new Error('Promise is canceled')) : resolve(val)),
      error => (hasCanceled ? reject(new Error('Promise is canceled')) : reject(error)),
    );
  }) as CancelablePromise<T>;

  wrappedPromise.cancel = () => {
    hasCanceled = true;
  };

  return wrappedPromise;
}
