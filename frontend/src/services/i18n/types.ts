import { tKeys } from './constants';

interface CustomTranslateFunction {
  (phrase: ITranslateKey): string;
  (phrase: string, options?: number | InterpolationOptions): string;
}

interface InterpolationOptions {
  smart_count?: number | { length: number };
  _?: string;

  [interpolationKey: string]: undefined | string | number | { length: number };
}

interface IPhraseWithOptions {
  key: string;
  params: Record<string, string | number>;
}

export type ITranslateFunction = CustomTranslateFunction;
export type ITranslateKey = string | IPhraseWithOptions;

export type Lang = 'en' | 'ru';

export interface ITranslateProps {
  locale: Lang;
  tKeys: typeof tKeys;
  t: ITranslateFunction;
  changeLanguage: null | ((locale: Lang) => void);
}
