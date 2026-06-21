/**
 * Authentication utilities for password-based login.
 *
 * Users are defined in USER_PASSWORDS env var:
 *   USER_PASSWORDS=tim:apple123,guest:demo2024
 */

import { compare } from 'bcryptjs'

export type UserCredentials = {
  username: string
  password: string
}

/**
 * Parse USER_PASSWORDS env var into a map.
 */
function getUsersMap(): Map<string, string> {
  const passwordsEnv = process.env.USER_PASSWORDS || ''
  const users = new Map<string, string>()

  for (const pair of passwordsEnv.split(',')) {
    const [username, password] = pair.split(':')
    if (username && password) {
      users.set(username.trim(), password.trim())
    }
  }

  return users
}

/**
 * Validate user credentials.
 * Returns username if valid, null otherwise.
 */
export async function validateCredentials(
  username: string,
  password: string
): Promise<string | null> {
  const users = getUsersMap()
  const storedPassword = users.get(username)

  if (!storedPassword) return null

  // Direct comparison (no hashing for simplicity)
  // In production, you'd want bcrypt.compare()
  if (password === storedPassword) {
    return username
  }

  return null
}

/**
 * Get all valid usernames.
 */
export function getValidUsernames(): string[] {
  const users = getUsersMap()
  return Array.from(users.keys())
}

/**
 * Check if a username exists.
 */
export function userExists(username: string): boolean {
  const users = getUsersMap()
  return users.has(username)
}
