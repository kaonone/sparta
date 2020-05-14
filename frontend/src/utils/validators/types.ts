import { ITranslateKey } from 'services/i18n';

export type Validator = (value: string) => ITranslateKey | undefined;
