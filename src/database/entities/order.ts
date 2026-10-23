import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { OrderItem } from "./order-item.js";

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  merchant_id: string;

  @Column({ type: 'bigint' })
  customer_id: string;

  @Column({ type: 'varchar', length: 20 })
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total_amount: number;

  // Heavy JSONB & TEXT columns to demonstrate why SELECT * ruins performance (Heap Fetches)
  @Column({ type: 'jsonb' })
  shipping_address: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: Relation<OrderItem[]>;
}