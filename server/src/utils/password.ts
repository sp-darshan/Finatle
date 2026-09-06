import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Generates a salt and hashes the plaintext password.
 * @param password Plaintext password to hash
 * @returns Hashed password with embedded salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * @param password Plaintext password
 * @param hashed Hashed password from database
 * @returns True if password matches hash, false otherwise
 */
export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}
