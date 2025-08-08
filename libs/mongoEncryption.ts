import crypto from 'node:crypto';

/* This file is not used yet, but should be used to cipher private database content.
 * When doing so, don't forget to prefix ciphered data with a custom/common prefix.
 * When starting to use this code, update or delete this comment */

const { MONGODB_ENCRYPTION_KEY } = process.env as {
  MONGODB_ENCRYPTION_KEY?: string;
};

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;

export class EncryptionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'EncryptionError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EncryptionError);
    }
  }
}

export class MongoEncryption {
  private readonly baseKey: string;

  constructor(alternateKey: string = '') {
    const encryptionKey = alternateKey || MONGODB_ENCRYPTION_KEY;

    if (!encryptionKey || encryptionKey.trim().length === 0) {
      throw new EncryptionError(
        'Encryption key is required and cannot be empty'
      );
    }

    this.baseKey = encryptionKey;
  }

  encrypt(data: any): string {
    try {
      if (data === undefined) {
        throw new EncryptionError('Cannot encrypt undefined data');
      }

      // Generate a random salt for each encryption
      const salt = crypto.randomBytes(SALT_LENGTH);
      const key = crypto.scryptSync(this.baseKey, salt, ENCRYPTION_KEY_LENGTH);

      const text = JSON.stringify(data);
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return salt + IV + authTag + encrypted data
      return (
        salt.toString('hex') +
        ':' +
        iv.toString('hex') +
        ':' +
        authTag.toString('hex') +
        ':' +
        encrypted
      );
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  decrypt<T = any>(encryptedData: string): T {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new EncryptionError('Encrypted data must be a non-empty string');
      }

      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new EncryptionError(
          'Invalid encrypted data format: expected 4 parts separated by colons'
        );
      }

      const [saltHex, ivHex, authTagHex, encrypted] = parts;

      // Validate hex strings
      if (
        !this.isValidHex(saltHex) ||
        !this.isValidHex(ivHex) ||
        !this.isValidHex(authTagHex)
      ) {
        throw new EncryptionError('Invalid hex encoding in encrypted data');
      }

      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Validate buffer lengths
      if (salt.length !== SALT_LENGTH) {
        throw new EncryptionError(
          `Invalid salt length: expected ${SALT_LENGTH}, got ${salt.length}`
        );
      }
      if (iv.length !== IV_LENGTH) {
        throw new EncryptionError(
          `Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`
        );
      }
      if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new EncryptionError(
          `Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`
        );
      }

      // Derive the key using the stored salt
      const key = crypto.scryptSync(this.baseKey, salt, ENCRYPTION_KEY_LENGTH);

      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw new EncryptionError(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validates if a string contains only valid hexadecimal characters
   */
  private isValidHex(str: string): boolean {
    return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0;
  }

  /**
   * Utility method to check if data was encrypted with this class format
   */
  isValidFormat(encryptedData: string): boolean {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return false;
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      return false;
    }

    const [saltHex, ivHex, authTagHex] = parts;
    return (
      this.isValidHex(saltHex) &&
      this.isValidHex(ivHex) &&
      this.isValidHex(authTagHex) &&
      Buffer.from(saltHex, 'hex').length === SALT_LENGTH &&
      Buffer.from(ivHex, 'hex').length === IV_LENGTH &&
      Buffer.from(authTagHex, 'hex').length === AUTH_TAG_LENGTH
    );
  }
}
