import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import type { SelectQueryBuilder } from 'typeorm';
import { Order } from '../database/index.js';
import type {
  ListOrdersCursorQueryDto,
  ListOrdersOffsetQueryDto,
} from './dto/list-orders.query.dto.js';
import { CursorPageDto, OrderListItemDto } from './dto/order-list-item.dto.js';
import { decodeOrderCursor, encodeOrderCursor } from './order-cursor.js';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

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
  async getOrdersSlow(dto: ListOrdersOffsetQueryDto) {
    const startTime = performance.now();
    const startDate = new Date(Date.now() - NINETY_DAYS_MS);
    const endDate = new Date();
    const offset = (dto.page - 1) * dto.limit;

    // Standard naive TypeORM call
    const [orders, totalCount] = await this.orderRepo.findAndCount({
      where: {
        merchant_id: dto.merchantId,
        status: dto.status,
        created_at: Between(startDate, endDate),
      },
      order: { created_at: 'DESC' },
      skip: offset,
      take: dto.limit,
    });

    const executionTimeMs = +(performance.now() - startTime).toFixed(2);

    // EXPLAIN the same query shape (find options can't hand back their SQL)
    const explainQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.merchant_id = :merchantId', { merchantId: dto.merchantId })
      .andWhere('o.status = :status', { status: dto.status })
      .andWhere('o.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('o.created_at', 'DESC')
      .offset(offset)
      .limit(dto.limit);

    return {
      mode: 'SLOW_NAIVE_TYPEORM',
      executionTimeMs,
      totalCount,
      rowsReturned: orders.length,
      postgresExplainPlan: await this.explain(explainQb),
      sampleRow: orders[0],
    };
  }

  /**
   * ✅ 2. THE OPTIMIZED QUERY (< 10ms via Covering Index + Cursor Pagination)
   * Uses the Order repository's QueryBuilder with:
   * - Only covering-index columns (triggers Index-Only Scan, 0 Heap Fetches!)
   * - Keyset Cursor pagination ((created_at, id) < (cursorDate, cursorId))
   * - limit + 1 pattern (eliminates blocking COUNT(*) query)
   */
  async getOrdersFast(dto: ListOrdersCursorQueryDto) {
    const startTime = performance.now();

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select([
        'o.id',
        'o.customer_id',
        'o.status',
        'o.total_amount',
        'o.created_at',
      ])
      .where('o.merchant_id = :merchantId', { merchantId: dto.merchantId })
      .andWhere('o.status = :status', { status: dto.status })
      .andWhere('o.created_at >= :startDate', {
        startDate: new Date(Date.now() - NINETY_DAYS_MS),
      });

    if (dto.cursor) {
      const { createdAt, id } = decodeOrderCursor(dto.cursor);
      // Row-value comparison: one index range scan. TypeORM has no API for tuples,
      // but this is still parameterised. The OR-expanded form plans worse.
      qb.andWhere('(o.created_at, o.id) < (:cursorDate, :cursorId)', {
        cursorDate: createdAt,
        cursorId: id,
      });
    }

    qb.orderBy('o.created_at', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .take(dto.limit + 1);

    const rows = await qb.getMany();
    const executionTimeMs = +(performance.now() - startTime).toFixed(2);

    const hasNextPage = rows.length > dto.limit;
    const pageRows = hasNextPage ? rows.slice(0, dto.limit) : rows;
    const last = pageRows.at(-1);

    const page: CursorPageDto<OrderListItemDto> = {
      data: pageRows.map((order) => OrderListItemDto.fromEntity(order)),
      hasNextPage,
      nextCursor:
        hasNextPage && last
          ? encodeOrderCursor({ createdAt: last.created_at, id: last.id })
          : null,
    };

    return {
      mode: 'FAST_OPTIMIZED_TYPEORM',
      executionTimeMs,
      rowsReturned: page.data.length,
      postgresExplainPlan: await this.explain(qb),
      ...page,
    };
  }

  /**
   * 🛠️ 3. TOGGLE INDEXES ON/OFF VIA API TO WATCH LATENCY DROP IN REAL TIME
   * Lab tooling only. The index is normally created by the AddOrdersEsrCoveringIndex
   * migration; these endpoints let you drop it to reproduce the slow baseline.
   */
  async applyCoveringIndex() {
    const start = performance.now();
    // No DESC needed: Postgres scans a B-tree backwards for ORDER BY created_at DESC, id DESC
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_esr_covering
      ON orders (merchant_id, status, created_at, id)
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
    await this.dataSource.query(
      `DROP INDEX IF EXISTS idx_orders_esr_covering;`,
    );
    return { status: 'Custom Indexes Dropped (Back to Full Table Scan)' };
  }

  // EXPLAIN has no TypeORM API, so run it over the exact SQL the QueryBuilder generated
  private async explain(qb: SelectQueryBuilder<Order>): Promise<string[]> {
    const [sql, params] = qb.getQueryAndParameters();
    const plan = await this.dataSource.query(
      `EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
      params,
    );
    return plan.map((r: Record<string, string>) => r['QUERY PLAN']);
  }
}
