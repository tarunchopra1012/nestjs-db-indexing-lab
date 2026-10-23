import { registerAs } from '@nestjs/config';

// Fail at startup with a clear message instead of connecting with `undefined`
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default registerAs('database', () => ({
  host: required('DB_HOST'),
  port: Number(required('DB_PORT')),
  username: required('DB_USERNAME'),
  password: required('DB_PASSWORD'),
  name: required('DB_NAME'),
  logging: process.env.DB_LOGGING === 'true',
  slowQueryMs: Number(process.env.DB_SLOW_QUERY_MS ?? 100),
}));
