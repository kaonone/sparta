declare module '_helpers' {
  /**
   * Remove properties `K` from `T`.
   *
   * @internal
   */
  export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

  /**
   * `T extends ConsistentWith<T, U>` means that where `T` has overlapping properties with
   * `U`, their value types do not conflict.
   *
   * @internal
   */
  export type ConsistentWith<T, U> = Pick<U, keyof T & keyof U>;

  type _Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
  /**
   * Like `T & U`, but using the value types from `U` where their properties overlap.
   *
   * @internal
   */
  export type Overwrite<T, U> = (U extends ConsistentWith<U, T> ? T : _Omit<T, keyof U>) & U;

  export type GetProps<T extends React.ComponentType<any>> = T extends React.StatelessComponent<
    infer SP
  >
    ? SP
    : T extends React.ComponentClass<infer CP>
    ? CP
    : never;

  export type PromisedReturnType<T extends (...args: any[]) => any> = T extends (
    ...args: any[]
  ) => Promise<infer R>
    ? R
    : ReturnType<T>;

  export type ArgumentTypes<F extends (...args: any[]) => any> = F extends (...args: infer A) => any
    ? A
    : never;

  export type Nullable<T> = T | null | undefined;

  export type SubSet<T, R extends T> = R;
  export type SubsetMapStrict<B extends { [key in keyof T]: any }, T extends B> = T;

  export type MergeRight<L, R> = R & Pick<L, Exclude<keyof L, keyof R>>;

  export type MarkAs<A, T> = {
    [key in keyof T]: A;
  };

  type CheckExtends<T, R> = T extends R ? true : unknown;
  export type CheckIdentity<T, R> =
    | CheckExtends<T, R>
    | CheckExtends<R, T>
    | CheckExtends<keyof T, keyof R>
    | CheckExtends<keyof R, keyof T> extends true
    ? T
    : unknown;

  export type MarkAsPartial<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> &
    {
      [key in K]?: T[key];
    };

  export type MarkAsRequired<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> &
    {
      [key in K]-?: Exclude<T[key], void>;
    };

  export type MarkNotIdentityProps<T, R> = {
    [K in keyof T & keyof R]: CheckIdentity<T[K], R[K]>;
  };

  // tslint:disable-next-line:ban-types
  export type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? K : never;
  }[keyof T];
  export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

  export type ArrayPropertyNames<T> = { [K in keyof T]: T[K] extends any[] ? K : never }[keyof T];

  export type NullablePropertyNames<T> = {
    [K in keyof T]: Extract<T[K], null> extends null ? K : never;
  }[keyof T];

  // tslint:disable-next-line:ban-types
  export type NonFunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
  }[keyof T];
  export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

  // tslint:disable-next-line:ban-types
  export type RequiredProps<T, K extends Extract<keyof T, string>> = Required<Pick<T, K>> &
    Omit<T, K>;

  export type DeepPartial<T> = T extends any[]
    ? IDeepPartialArray<T[number]>
    : T extends object
    ? DeepPartialObject<T>
    : T;

  interface IDeepPartialArray<T> extends Array<DeepPartial<T>> {}

  type DeepPartialObject<T> = {
    readonly [P in NonFunctionPropertyNames<T>]?: DeepPartial<T[P]>;
  };

  type UnionToIntersection<U> = (U extends any
  ? (k: U) => void
  : never) extends (k: infer I) => void
    ? I
    : never;

  type ExtractByType<I extends { type: string }, T extends I['type']> = I extends { type: T }
    ? I
    : never;
}
