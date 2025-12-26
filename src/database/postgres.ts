import { Pool, PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config';
import logger from '../utils/logger';
import * as schema from './schema';

class PostgresConnection {
  private pool: Pool;
  private client: ReturnType<typeof postgres>;
  public db: ReturnType<typeof drizzle<typeof schema>>;

  constructor() {
    // Initialize postgres-js client for Drizzle ORM
    const connectionString = config.database.postgres.connectionString ||
      `postgresql://${config.database.postgres.user}:${config.database.postgres.password}@${config.database.postgres.host}:${config.database.postgres.port}/${config.database.postgres.database}`;
    
    // Disable prefetch for Supabase Transaction pool mode compatibility
    this.client = postgres(connectionString, { prepare: false });
    
    // Initialize Drizzle ORM with postgres-js client
    this.db = drizzle(this.client, { schema });

    // Keep pg Pool for legacy query() method support
    const poolConfig = config.database.postgres.connectionString
      ? {
          connectionString: config.database.postgres.connectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        }
      : {
          host: config.database.postgres.host,
          port: config.database.postgres.port,
          database: config.database.postgres.database,
          user: config.database.postgres.user,
          password: config.database.postgres.password,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        };

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      logger.info('PostgreSQL connected successfully');
      client.release();
    } catch (error) {
      logger.error('PostgreSQL connection failed', error);
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Query error', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async close(): Promise<void> {
    await this.client.end();
    await this.pool.end();
    logger.info('PostgreSQL connection closed');
  }
}

export const postgresDB = new PostgresConnection();
export const db = postgresDB.db;
