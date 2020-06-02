interface NodeModule {
  hot?: {
    accept(modules: string[], callback: () => void): void;
  };
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'none' | 'development' | 'production';
  }
}
