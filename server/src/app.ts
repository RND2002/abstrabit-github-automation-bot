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
import repoRoutes from './modules/repo/repo.routes';
import webhookRoutes from './modules/webhook/webhook.routes';
import ruleRoutes from './modules/rule/rule.routes';
import eventRoutes from './modules/event/event.routes';

export const app: Application = express();

// Set security HTTP headers
app.use(helmet());

// Parse json request body and save raw body for webhooks
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
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
  app.use(pinoHttp({ 
    logger,
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode })
    }
  }));
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// api routes
app.use('/api/auth', authRoutes);
app.use('/api/repo', repoRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/rule', ruleRoutes);
app.use('/api/event', eventRoutes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);
