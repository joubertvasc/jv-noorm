export class DBSchemaNotDefinedError extends Error {
  constructor(message?: string) {
    super(message || 'db-schema-not-defined');
  }
}
