import { randomBytes, createHash } from 'node:crypto'

/** Generates a random token to send to the user (e.g. in an email link). */
export function generateRawToken(): string {
  return randomBytes(32).toString('hex')
}

/** Hashes a token for storage — never store the raw token in the database. */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}
