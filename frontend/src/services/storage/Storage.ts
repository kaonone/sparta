/* eslint-disable no-dupe-class-members */
import { Tuple } from 'ts-toolbelt';

import { StorageAdapter, StatesToMigrations } from './types';
import { FallbackAdapter } from './FallbackAdapter';

function entries<Object>(obj: Object) {
  return Object.entries(obj) as [keyof Object, any][];
}

interface IData {
  [key: string]: any;
  version?: number;
}

class Storage<States extends IData[]> {
  public static namespaces: string[] = [];

  constructor(
    private currentNamespace: string,
    private adapter: StorageAdapter,
    private initialState: Tuple.Last<States>,
    private migrations: StatesToMigrations<States>,
  ) {
    if (Storage.namespaces.includes(currentNamespace)) {
      throw new Error(`Namespace '${currentNamespace}' is already exist`);
    }

    if (!this.adapter.checkAvailability()) {
      this.adapter = new FallbackAdapter();

      console.warn(
        `Storage '${currentNamespace}' is not available! Fallback storage will be used.`,
      );
    }

    Storage.namespaces = [...Storage.namespaces, currentNamespace];
    this.normalizeVersion();
  }

  // eslint-disable-next-line class-methods-use-this
  public set(data: Tuple.Last<States>): void {
    entries(data).forEach(item => {
      const [key, value] = item;
      this.setItem(key, value);
    });
  }

  public get(): Tuple.Last<States> {
    return this.adapter.getAllKeys().reduce((acc, currentKey) => {
      if (!this.isCurrentNamespaceKey(currentKey)) {
        return acc;
      }

      const key = this.getShortKey(currentKey);
      const data = this.getItem(key);

      return {
        ...acc,
        [key]: data,
      };
    }, {} as Tuple.Last<States>);
  }

  public setItem<Key extends keyof Tuple.Last<States>>(
    key: Key,
    value: Tuple.Last<States>[Key],
  ): void {
    const convertedValue = JSON.stringify(value);

    this.adapter.setItem(this.getFullKey(key), convertedValue);
  }

  public getItem<Key extends keyof Tuple.Last<States>>(key: Key): Tuple.Last<States>[Key] {
    const data = this.adapter.getItem(this.getFullKey(key));

    if (!data) {
      throw new Error(`${key} value is not found`);
    }

    return JSON.parse(data);
  }

  private normalizeVersion() {
    const version = this.getVersion();

    if (typeof version === 'number') {
      this.executeMigrations(version);
    } else {
      this.reset();
      this.set(this.initialState);
    }
    this.saveVersion((this.migrations.length as unknown) as number);
  }

  private executeMigrations(currentVersion: number) {
    const migrations = ((this.migrations.slice as unknown) as Array<(state: any) => any>['slice'])(
      currentVersion,
    );

    if (!migrations.length) {
      return;
    }

    const currentData = this.get();
    const newData = migrations.reduce((data, migration) => migration(data), currentData);
    this.reset();
    this.set(newData);
  }

  public reset() {
    this.adapter.getAllKeys().forEach(key => {
      if (this.isCurrentNamespaceKey(key)) {
        this.adapter.removeItem(key);
      }
    });
  }

  private getVersion(): number | undefined | null {
    try {
      return this.getItem('version');
    } catch {
      return null;
    }
  }

  private saveVersion(version: number) {
    this.setItem('version', version);
  }

  private getFullKey<Key extends keyof Tuple.Last<States>>(key: Key): string {
    return `${this.currentNamespace}:${key}`;
  }

  private getShortKey(key: string): keyof Tuple.Last<States> {
    return key.replace(`${this.currentNamespace}:`, '');
  }

  private isCurrentNamespaceKey(key: string | number | symbol): boolean {
    return (
      typeof key === 'string' &&
      new RegExp(`^${this.getFullKey('' as keyof Tuple.Last<States>)}.+$`).test(key)
    );
  }
}

export { Storage };
