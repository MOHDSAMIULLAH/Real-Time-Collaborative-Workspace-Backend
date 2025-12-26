import 'reflect-metadata';
import { App } from './app';
import logger from './utils/logger';

async function bootstrap() {
  try {
    const app = new App();
    await app.start();

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received');
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received');
      await app.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Bootstrap failed', error);
    process.exit(1);
  }
}

bootstrap();
