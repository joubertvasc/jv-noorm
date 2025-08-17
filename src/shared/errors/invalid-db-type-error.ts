export class InvalidDBTypeError extends Error {
  constructor(message?: string) {
    super(message || 'invalid-db-type');
  }
}
