import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  merchant_id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;
}