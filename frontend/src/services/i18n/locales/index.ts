import { SubSet } from '_helpers';

import { Lang } from '../types';
import { en } from './en';
import { ru } from './ru';

const phrasesByLocale: SubSet<Record<Lang, any>, { en: typeof en; ru: typeof ru }> = { en, ru };

export { en, ru, phrasesByLocale };
