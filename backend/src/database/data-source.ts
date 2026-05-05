import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { typeOrmEntities } from './typeorm-entities';

/** Preserve URL already set by the parent process (e.g. e2e script / CI), so .env cannot override it. */
const presetDatabaseUrl = process.env.DATABASE_URL;

const envCandidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '..', '.env')];
for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
    break;
  }
}

if (presetDatabaseUrl) {
  process.env.DATABASE_URL = presetDatabaseUrl;
}

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: typeOrmEntities,
  migrations: [join(__dirname, 'migrations', '*.js')],
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

export default AppDataSource;
