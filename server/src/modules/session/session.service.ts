import * as sessionRepository from './session.repository';
import { encrypt, decrypt } from '../../core/utils/crypto.util';
import { Constants } from '../../config/constants';

export const createSession = async (userId: string, githubToken: string) => {
  const encryptedToken = encrypt(githubToken);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Constants.Auth.SessionExpiryDays);

  return sessionRepository.create(userId, encryptedToken, expiresAt);
};

export const validateSession = async (sessionId: string) => {
  const session = await sessionRepository.findValid(sessionId);
  
  if (!session) {
    return null;
  }

  // Decrypt token on the fly when validating if we need to return it, 
  // or we can just return the user. Usually we need the token for GitHub API calls.
  const decryptedToken = decrypt(session.token);

  return {
    ...session,
    token: decryptedToken,
  };
};

export const revokeSession = async (sessionId: string) => {
  return sessionRepository.revoke(sessionId);
};
