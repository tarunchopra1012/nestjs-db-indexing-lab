// Stored as a native Postgres enum (4 bytes) instead of VARCHAR(20),
// which keeps every index entry that contains `status` smaller.
export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}
