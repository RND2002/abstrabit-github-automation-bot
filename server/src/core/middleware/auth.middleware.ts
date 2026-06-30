import { Request, Response, NextFunction } from 'express';
import { validateSession } from '../../modules/session/session.service';
import { ApiError } from '../utils/apiError';
import { Constants } from '../../config/constants';
import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      githubToken?: string;
      sessionId?: string;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies[Constants.Cookie.Session];
    
    if (!sessionId) {
      throw new ApiError(401, 'Unauthorized - No session cookie');
    }

    const sessionData = await validateSession(sessionId);

    if (!sessionData) {
      res.clearCookie(Constants.Cookie.Session);
      throw new ApiError(401, 'Unauthorized - Invalid or expired session');
    }

    req.user = sessionData.user;
    req.githubToken = sessionData.token;
    req.sessionId = sessionData.id;

    next();
  } catch (error) {
    next(error);
  }
};
