export interface IGetKey {
  getKey(): string;
}

export interface IConcatKey {
  concat(key: string): string;
}

interface ITree extends Record<string, ITree | string> {}

type TranslationKeysTree<T> = {
  [key in keyof T]: T[key] extends Record<string, string>
    ? TranslationKeysTree<T[key]> & IConcatKey
    : T[key] extends ITree
    ? TranslationKeysTree<T[key]>
    : T[key] extends string
    ? IGetKey
    : never;
};

export function buildTranslationKeys<T extends ITree>(messagesTree: T): TranslationKeysTree<T> {
  return (function loop<IT extends ITree>(tree: IT, path: string[] = []): TranslationKeysTree<IT> {
    return Object.keys(tree)
      .map<[string, string | ITree]>(key => [key, tree[key]])
      .reduce<TranslationKeysTree<IT>>((acc, [key, value]) => {
        const xPath = [...path, key];

        const routeData: IGetKey & IConcatKey = {
          getKey: () => xPath.join('.'),
          concat: (_key: string) => xPath.concat(_key).join('.'),
        };
        if (typeof value === 'string') {
          return { ...acc, [key]: routeData };
        }
        return {
          ...acc,
          [key]: {
            ...loop(value, xPath),
            ...routeData,
          },
        };
      }, {} as TranslationKeysTree<IT>);
  })(messagesTree);
}
