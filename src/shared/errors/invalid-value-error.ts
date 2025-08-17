export class InvalidValueError extends Error {
  constructor(message?: string) {
    super(message ?? 'invalid-value');
  }
}
