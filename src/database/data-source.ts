import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Customer, Product, Order, OrderItem } from './index.js';

// Used only by the TypeORM CLI (migration:generate / migration:run).
// Env vars are loaded with `node --env-file=.env` in the npm scripts.
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Customer, Product, Order, OrderItem],
  migrations: ['dist/database/migrations/*.js'],
  // One transaction per migration, so a migration can opt out with `transaction = false`
  // (needed for CREATE INDEX CONCURRENTLY). The default "all" refuses that override.
  migrationsTransactionMode: 'each',
});
