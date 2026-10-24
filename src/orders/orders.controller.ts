import { Controller, Get, Post, Delete, Query } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import {
  ListOrdersCursorQueryDto,
  ListOrdersOffsetQueryDto,
} from './dto/list-orders.query.dto.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 1. Trigger Slow Query: GET http://localhost:3000/orders/slow?merchantId=42&status=PENDING&page=200
  @Get('slow')
  getSlow(@Query() query: ListOrdersOffsetQueryDto) {
    return this.ordersService.getOrdersSlow(query);
  }

  // 2. Trigger Fast Query: GET http://localhost:3000/orders/fast?merchantId=42&status=PENDING
  //    Next page: append &cursor=<nextCursor from the previous response>
  @Get('fast')
  getFast(@Query() query: ListOrdersCursorQueryDto) {
    return this.ordersService.getOrdersFast(query);
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
