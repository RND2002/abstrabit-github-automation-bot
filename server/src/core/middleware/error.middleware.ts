import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { ApiError } from '../utils/apiError';
import { env } from '../../config/env';
import { logger } from '../utils/logger';
import { revokeSession } from '../../modules/session/session.service';
import { Constants } from '../../config/constants';

export const errorConverter = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error instanceof ZodError) {
      const apiError = new ApiError(
        400,
        'Validation Error',
        true,
        error.stack,
      );

      (apiError as any).issues = error.issues;
      error = apiError;
    } else {
      error = new ApiError(
        error.statusCode || 500,
        error.message || 'Internal Server Error',
        false,
        error.stack,
      );
      error.originalError = err;
    }
  }

  next(error);
};

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let { statusCode, message } = err;

  const isProduction = env.NODE_ENV === 'production';

  // Always log the actual error
  logger.error({
    err: err.originalError || err,
    message: err.message,
    statusCode: err.statusCode,
    isOperational: err.isOperational,
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    params: req.params,
  });

  // Handle 401 Unauthorized globally by clearing cookie and revoking session
  if (statusCode === 401) {
    const isSecure = env.NODE_ENV === 'production' || 
                     env.API_URL?.startsWith('https') || 
                     req.secure || 
                     req.headers['x-forwarded-proto'] === 'https';

    res.clearCookie(Constants.Cookie.Session, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'none',
    });

    if (req.sessionId) {
      revokeSession(req.sessionId).catch((error) => {
        logger.error({ err: error }, 'Failed to revoke session during 401 handling');
      });
    }
  }

  // Hide internal errors from clients in production
  if (isProduction && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response: Record<string, any> = {
    code: statusCode,
    message,
  };

  if ((err as any).issues) {
    response.issues = (err as any).issues;
  }

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
