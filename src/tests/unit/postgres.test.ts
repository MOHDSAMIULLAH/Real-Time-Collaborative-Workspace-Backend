import { postgresDB } from '../../database/postgres';

describe('Postgres Connection', () => {
  it('should execute a query', async () => {
    const result = await postgresDB.query('SELECT 1 as test');

    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rows[0].test).toBe(1);
  });

  it('should handle query with parameters', async () => {
    const result = await postgresDB.query('SELECT $1::text as test', ['hello']);

    expect(result).toBeDefined();
    expect(result.rows[0].test).toBe('hello');
  });

  it('should get a client from pool', async () => {
    const client = await postgresDB.getClient();

    expect(client).toBeDefined();

    client.release();
  });

  it('should handle query errors', async () => {
    await expect(postgresDB.query('SELECT * FROM non_existent_table')).rejects.toThrow();
  });

  it('should have drizzle db instance', () => {
    expect(postgresDB.db).toBeDefined();
  });
});
