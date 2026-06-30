import { Request, Response } from 'express';
import { env } from '../../config/env';
import { handleGithubCallback } from './auth.service';
import { revokeSession } from '../session/session.service';
import { Constants } from '../../config/constants';
import { ApiError } from '../../core/utils/apiError';

export const redirect = (req: Request, res: Response) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${env.GITHUB_REDIRECT_URI}&scope=repo,admin:repo_hook`;
  res.redirect(url);
};

export const callback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    throw new ApiError(400, 'Code is required');
  }

  const { session } = await handleGithubCallback(code);

  res.cookie(Constants.Cookie.Session, session.id, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    maxAge: Constants.Auth.SessionExpiryDays * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  });

  res.redirect(env.FRONTEND_URL + '/');
};

export const logout = async (req: Request, res: Response) => {
  if (req.sessionId) {
    await revokeSession(req.sessionId);
  }

  res.clearCookie(Constants.Cookie.Session);
  res.status(200).send({ success: true });
};

export const me = (req: Request, res: Response) => {
  res.status(200).send({ user: req.user });
};
