import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { OrderItem } from './order-item.js';
import { OrderStatus } from '../enums/order-status.enum.js';

@Entity('orders')
// ESR covering index: (merchant_id, status, created_at, id) INCLUDE (customer_id, total_amount).
// TypeORM can't express INCLUDE, so it's hand-written in the AddOrdersEsrCoveringIndex migration.
// synchronize: false tells migration:generate the index exists and must not be dropped.
@Index('idx_orders_esr_covering', { synchronize: false })
export class Order {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ type: 'bigint' })
  merchant_id: string;

  @Column({ type: 'bigint' })
  customer_id: string;

  @Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status' })
  status: OrderStatus;

  // pg returns NUMERIC as a string to avoid float rounding
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total_amount: string;

  // Heavy JSONB & TEXT columns to demonstrate why SELECT * ruins performance (Heap Fetches)
  @Column({ type: 'jsonb' })
  shipping_address: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Millisecond precision so a JS Date round-trips exactly through the pagination cursor.
  // With the default (microseconds), the cursor truncates and rows get skipped between pages.
  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  created_at: Date;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: Relation<OrderItem[]>;
}
