export class WrongDeleteStatementError extends Error {
  constructor(message?: string) {
    super(message || 'wrong-delete-statement');
  }
}
