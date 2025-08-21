export class DBURLError extends Error {
  constructor(message?: string) {
    super(message || 'invalid-database-url');
  }
}
