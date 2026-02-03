'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  path: string;
  operation: string;
  requestResourceData?: any;

  constructor(context: SecurityRuleContext) {
    const message = `Missing or insufficient permissions: ${context.operation} at ${context.path}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.path = context.path;
    this.operation = context.operation;
    this.requestResourceData = context.requestResourceData;
    
    // Ensure the prototype is set correctly for instanceof checks
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
