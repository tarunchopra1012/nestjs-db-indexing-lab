import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OrderStatus } from '../../database/index.js';

// Defaults keep the lab URLs short: merchant 42 is the seeded "super merchant".
class OrdersFilterDto {
  @IsOptional()
  @IsNumberString()
  merchantId: string = '42'; // bigint → kept as string

  @IsOptional()
  @IsEnum(OrderStatus)
  status: OrderStatus = OrderStatus.PENDING;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

// GET /orders/slow — OFFSET pagination (the anti-pattern being demonstrated)
export class ListOrdersOffsetQueryDto extends OrdersFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 200;
}

// GET /orders/fast — keyset (cursor) pagination
export class ListOrdersCursorQueryDto extends OrdersFilterDto {
  // Opaque value taken from the previous response's `nextCursor`
  @IsOptional()
  @IsString()
  cursor?: string;
}
