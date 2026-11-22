// SCIP - Clerk Identity Error Types (Phase 3.1.2A)
// Shared, typed errors for Clerk identity resolution so repositories and the
// authentication middleware can fail closed consistently across JSON and MongoDB.

/**
 * Thrown when more than one SCIP user record is found for the same non-empty
 * Clerk identity. This indicates data corruption or a uniqueness violation and
 * must never be resolved by silently choosing the first match.
 */
export class DuplicateClerkIdentityError extends Error {
  readonly code = 'DUPLICATE_CLERK_IDENTITY';
  constructor() {
    super('Duplicate Clerk identity mapping detected.');
    this.name = 'DuplicateClerkIdentityError';
  }
}

/** Type guard for DuplicateClerkIdentityError. */
export function isDuplicateClerkIdentityError(err: unknown): err is DuplicateClerkIdentityError {
  return err instanceof DuplicateClerkIdentityError
    || (typeof err === 'object' && err !== null && (err as any).code === 'DUPLICATE_CLERK_IDENTITY');
}