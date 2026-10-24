import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config.js';
import { Customer, Product, Order, OrderItem, QueryProfilerLogger } from './database/index.js';
import { OrdersModule } from './orders/orders.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>) => ({
        type: 'postgres',
        host: db.host,
        port: db.port,
        username: db.username,
        password: db.password,
        database: db.name,
        entities: [Customer, Product, Order, OrderItem],
        synchronize: false, // Schema is managed by migrations (npm run migration:run)
        logging: db.logging,
        maxQueryExecutionTime: db.slowQueryMs, // Triggers [SLOW QUERY ALERT] if query is slower
        logger: new QueryProfilerLogger(),
      }),
    }),
    OrdersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
