import { Logger as TypeOrmLogger } from 'typeorm';

export class QueryProfilerLogger implements TypeOrmLogger {
  logQuery(query: string, parameters?: any[]) {
    console.log(`\x1b[36m[SQL EXEC]\x1b[0m ${query} -- Params: ${JSON.stringify(parameters || [])}`);
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    console.warn(`\x1b[31m[SLOW QUERY ALERT: ${time}ms]\x1b[0m ${query} -- Params: ${JSON.stringify(parameters || [])}`);
  }

  logQueryError(error: string, query: string) { console.error(error, query); }
  logSchemaBuild(message: string) {}
  logMigration(message: string) {}
  log(level: 'log' | 'info' | 'warn', message: any) {}
}