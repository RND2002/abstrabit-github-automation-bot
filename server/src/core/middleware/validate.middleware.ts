import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema } from 'zod';

/**
 * Express middleware that validates req.body against a Zod schema.
 * On success the parsed (and potentially transformed) data replaces req.body.
 * On failure the ZodError is forwarded to the error-handling pipeline.
 */
export const validate = (schema: ZodSchema): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Forward ZodError — errorConverter already knows how to handle it
      return next(result.error);
    }

    // Replace body with parsed & coerced data
    req.body = result.data;
    next();
  };
};
