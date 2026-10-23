import { Controller, Get, Post, Delete, Query } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 1. Trigger Slow Query: GET http://localhost:3000/orders/slow?merchantId=42&status=PENDING&page=200
  @Get('slow')
  getSlow(
    @Query('merchantId') merchantId = 42,
    @Query('status') status = 'PENDING',
    @Query('page') page = 200,
  ) {
    return this.ordersService.getOrdersSlow(+merchantId, status, +page);
  }

  // 2. Trigger Fast Query: GET http://localhost:3000/orders/fast?merchantId=42&status=PENDING
  @Get('fast')
  getFast(
    @Query('merchantId') merchantId = 42,
    @Query('status') status = 'PENDING',
    @Query('cursorDate') cursorDate?: string,
    @Query('cursorId') cursorId?: number,
  ) {
    return this.ordersService.getOrdersFast(
      +merchantId,
      status,
      20,
      cursorDate,
      cursorId ? +cursorId : undefined,
    );
  }

  // 3. Create the ESR Covering Index: POST http://localhost:3000/orders/index
  @Post('index')
  createIndex() {
    return this.ordersService.applyCoveringIndex();
  }

  // 4. Drop the Index to reset test: DELETE http://localhost:3000/orders/index
  @Delete('index')
  dropIndex() {
    return this.ordersService.dropIndexes();
  }
}