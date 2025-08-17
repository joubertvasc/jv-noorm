export class DBNotConnectedError extends Error {
  constructor(message?: string) {
    super(message || 'db-not-connected');
  }
}
