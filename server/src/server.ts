import { app } from './app';
import { env } from './config/env';
import { logger } from './core/utils/logger';
import { prisma } from './core/db/prisma';

let server: any;

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: unknown) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});

async function start() {
  try {
    await prisma.$connect();
    logger.info('Connected to DB');
    
    server = app.listen(env.PORT, () => {
      logger.info(`Listening to port ${env.PORT}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
