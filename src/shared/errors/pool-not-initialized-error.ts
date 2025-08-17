export class PoolNotInitializedError extends Error {
  constructor(message?: string) {
    super(message || 'pool-not-initialized');
  }
}
