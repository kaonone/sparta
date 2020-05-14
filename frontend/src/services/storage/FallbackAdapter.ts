import { StorageAdapter } from './types';

class FallbackAdapter implements StorageAdapter {
  private state: Record<string, string> = {};

  // eslint-disable-next-line class-methods-use-this
  checkAvailability() {
    return true;
  }

  setItem(key: string, value: string): void {
    this.state[key] = value;
  }

  getItem(key: string): string {
    return this.state[key];
  }

  removeItem(key: string): void {
    delete this.state[key];
  }

  getAllKeys(): string[] {
    return Object.keys(this.state);
  }
}

export { FallbackAdapter };
