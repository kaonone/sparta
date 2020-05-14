import { Storage, localStorageAdapter } from 'services/storage';

interface State {
  hideCookiesMsg: boolean;
}

export const cookiesStorage = new Storage<[State]>(
  'cookies',
  localStorageAdapter,
  {
    hideCookiesMsg: false,
  },
  [],
);
