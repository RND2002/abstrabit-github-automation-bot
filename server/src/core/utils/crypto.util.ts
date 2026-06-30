import crypto from 'crypto';
import { env } from '../../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// The encryption key must be 32 chars
const getEncryptionKey = () => {
  return Buffer.from(env.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
};

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getEncryptionKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();

  // Return formatted string: iv:salt:tag:encryptedData
  return `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const textParts = encryptedText.split(':');
  
  if (textParts.length !== 4) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(textParts[0]!, 'hex');
  // const salt = Buffer.from(textParts[1]!, 'hex'); // Salt is part of the output format but not used directly here since we use fixed key, if derived we would use it.
  const tag = Buffer.from(textParts[2]!, 'hex');
  const encryptedData = textParts[3]!;

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};
