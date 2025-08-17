export class EnvNotDefinedError extends Error {
  constructor(message?: string) {
    super(message ?? 'env-not-defined');
  }
}
