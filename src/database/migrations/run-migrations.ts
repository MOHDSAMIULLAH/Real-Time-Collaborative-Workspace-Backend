import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, postgresDB } from '../postgres';
import logger from '../../utils/logger';

export const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Starting database migrations...');
    
    // Run migrations using Drizzle
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Error running database migrations', error);
    throw error;
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed', error);
      process.exit(1);
    });
}
