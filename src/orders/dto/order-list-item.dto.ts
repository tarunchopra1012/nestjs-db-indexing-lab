import type { Order, OrderStatus } from '../../database/index.js';

// Only columns that live in idx_orders_esr_covering, so the query stays an Index-Only Scan
export class OrderListItemDto {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt: string;

  static fromEntity(order: Order): OrderListItemDto {
    return {
      id: order.id,
      customerId: order.customer_id,
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: order.created_at.toISOString(),
    };
  }
}

export class CursorPageDto<T> {
  data: T[];
  hasNextPage: boolean;
  nextCursor: string | null;
}
