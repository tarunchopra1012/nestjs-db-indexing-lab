import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Order } from '../database/index.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * ❌ 1. THE SLOW QUERY (Simulates the 18s Bottleneck)
   * Uses standard TypeORM findAndCount() which does:
   * - SELECT * (pulls heavy shipping_address JSONB & notes TEXT from Heap)
   * - SELECT COUNT(*) (scans all matching rows a second time!)
   * - OFFSET pagination (scans and discards N rows)
   */
  async getOrdersSlow(merchantId: number, status: any, page = 200, limit = 20) {
    const startTime = performance.now();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const endDate = new Date();
    const offset = (page - 1) * limit;

    // Standard naive TypeORM call
    const [orders, totalCount] = await this.orderRepo.findAndCount({
      where: {
        merchant_id: String(merchantId),
        status,
        created_at: Between(startDate, endDate),
      },
      order: { created_at: 'DESC' },
      skip: offset,
      take: limit,
    });

    const executionTimeMs = +(performance.now() - startTime).toFixed(2);

    // Grab the exact Postgres execution plan to see Seq Scan / Heap Fetches
    const explainPlan = await this.dataSource.query(
      `EXPLAIN (ANALYZE, BUFFERS) 
       SELECT * FROM orders 
       WHERE merchant_id = $1 AND status = $2 AND created_at BETWEEN $3 AND $4 
       ORDER BY created_at DESC LIMIT $5 OFFSET $6`,
      [merchantId, status, startDate, endDate, limit, offset],
    );

    return {
      mode: 'SLOW_NAIVE_TYPEORM',
      executionTimeMs,
      totalCount,
      rowsReturned: orders.length,
      postgresExplainPlan: explainPlan.map((r: any) => r['QUERY PLAN']),
      sampleRow: orders[0],
    };
  }

  /**
   * ✅ 2. THE OPTIMIZED QUERY (< 10ms via Covering Index + Cursor Pagination)
   * Uses TypeORM QueryBuilder with:
   * - Explicit lightweight columns (triggers Index-Only Scan, 0 Heap Fetches!)
   * - Keyset Cursor pagination ((created_at, id) < (cursorDate, cursorId))
   * - limit + 1 pattern (eliminates blocking COUNT(*) query)
   * - getRawMany() (skips heavy TypeORM Entity hydration CPU overhead)
   */
  async getOrdersFast(
    merchantId: number,
    status: string,
    limit = 20,
    cursorDate?: string,
    cursorId?: number,
  ) {
    const startTime = performance.now();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const qb = this.dataSource
      .createQueryBuilder()
      .select([
        'o.id AS "id"',
        'o.customer_id AS "customerId"',
        'o.status AS "status"',
        'o.total_amount AS "totalAmount"',
        'o.created_at AS "createdAt"',
      ])
      .from('orders', 'o')
      .where('o.merchant_id = :merchantId', { merchantId })
      .andWhere('o.status = :status', { status })
      .andWhere('o.created_at >= :startDate', { startDate })
      .andWhere('o.created_at <= :endDate', { endDate });

    if (cursorDate && cursorId) {
      qb.andWhere('(o.created_at, o.id) < (:cursorDate, :cursorId)', {
        cursorDate,
        cursorId,
      });
    }

    const rows = await qb
      .orderBy('o.created_at', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .limit(limit + 1)
      .getRawMany();

    const executionTimeMs = +(performance.now() - startTime).toFixed(2);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? data[data.length - 1] : null;

    // Run EXPLAIN ANALYZE on the exact generated SQL from TypeORM QueryBuilder
    const [sql, params] = qb.getQueryAndParameters();
    const explainPlan = await this.dataSource.query(
      `EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
      params,
    );

    return {
      mode: 'FAST_OPTIMIZED_TYPEORM',
      executionTimeMs,
      rowsReturned: data.length,
      hasNextPage,
      nextCursor: nextCursor
        ? { cursorDate: nextCursor.createdAt, cursorId: nextCursor.id }
        : null,
      postgresExplainPlan: explainPlan.map((r: any) => r['QUERY PLAN']),
      sampleRow: data[0],
    };
  }

  /**
   * 🛠️ 3. TOGGLE INDEXES ON/OFF VIA API TO WATCH LATENCY DROP IN REAL TIME
   */
  async applyCoveringIndex() {
    const start = performance.now();
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_esr_covering
      ON orders (merchant_id, status, created_at DESC, id DESC)
      INCLUDE (customer_id, total_amount);
    `);
    // Run VACUUM ANALYZE so the Visibility Map is updated for Index-Only Scans!
    await this.dataSource.query(`VACUUM ANALYZE orders;`);
    return {
      status: 'Covering Index Created & Table Vacuumed',
      timeTakenMs: +(performance.now() - start).toFixed(2),
    };
  }

  async dropIndexes() {
    await this.dataSource.query(`DROP INDEX IF EXISTS idx_orders_esr_covering;`);
    return { status: 'Custom Indexes Dropped (Back to Full Table Scan)' };
  }
}