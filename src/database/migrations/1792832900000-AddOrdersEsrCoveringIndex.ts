import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hand-written: TypeORM's @Index can't express INCLUDE, so migration:generate
 * will never produce this. The Order entity declares it with synchronize: false.
 *
 * - ESR key order: Equality (merchant_id, status) → Sort/Range (created_at, id)
 * - INCLUDE (customer_id, total_amount): stored in leaf pages only, so the list
 *   query is answered from the index alone (Index-Only Scan)
 * - No DESC: Postgres scans the B-tree backwards for ORDER BY created_at DESC, id DESC
 */
export class AddOrdersEsrCoveringIndex1792832900000 implements MigrationInterface {
  name = 'AddOrdersEsrCoveringIndex1792832900000';

  // CREATE INDEX CONCURRENTLY can't run inside a transaction
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // CONCURRENTLY: don't block inserts while the index builds on a large table
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_esr_covering
      ON orders (merchant_id, status, created_at, id)
      INCLUDE (customer_id, total_amount)
    `);
    // Index-Only Scans skip the heap only for pages marked all-visible.
    // Vacuum this table after 2% of rows change instead of the default 20%.
    await queryRunner.query(
      `ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.02)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE orders RESET (autovacuum_vacuum_scale_factor)`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_orders_esr_covering`,
    );
  }
}
