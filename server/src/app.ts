import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './core/utils/logger';
import { errorConverter, errorHandler } from './core/middleware/error.middleware';
import { ApiError } from './core/utils/apiError';
import { env } from './config/env';
import authRoutes from './modules/auth/auth.routes';

export const app: Application = express();

// Set security HTTP headers
app.use(helmet());

// Parse json request body
app.use(express.json());
// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));
// Parse cookies
app.use(cookieParser());

// Gzip compression
app.use(compression());

// Enable cors
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Logger middleware
if (env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// v1 api routes
app.use('/auth', authRoutes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);
