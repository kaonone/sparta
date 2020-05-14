import * as React from 'react';
import Polyglot from 'node-polyglot';

import { buildTranslationKeys } from 'utils/buildTranslationKeys';

import { Lang, ITranslateFunction, ITranslateProps } from './types';
import { en, phrasesByLocale } from './locales';

export const LANGUAGES: Lang[] = Object.keys(phrasesByLocale) as Lang[];

export const DEFAULT_LANGUAGE: Lang = 'en';

export const tKeys = buildTranslationKeys(en);

const polyglot: Polyglot = new Polyglot({
  locale: DEFAULT_LANGUAGE,
  phrases: phrasesByLocale[DEFAULT_LANGUAGE],
});

export const TContext = React.createContext<ITranslateProps>({
  t: polyglot.t.bind(polyglot) as ITranslateFunction,
  locale: DEFAULT_LANGUAGE,
  changeLanguage: null,
  tKeys,
});
