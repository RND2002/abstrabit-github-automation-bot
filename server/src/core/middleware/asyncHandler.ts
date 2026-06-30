import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandlerFunc = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncHandlerFunc): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
