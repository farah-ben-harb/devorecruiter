import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const databasePort = Number.parseInt(
  requiredEnvironmentVariable('DATABASE_PORT'),
  10,
);

if (Number.isNaN(databasePort)) {
  throw new Error('DATABASE_PORT must be a valid integer');
}

export default new DataSource({
  type: 'postgres',
  host: requiredEnvironmentVariable('DATABASE_HOST'),
  port: databasePort,
  username: requiredEnvironmentVariable('DATABASE_USER'),
  password: requiredEnvironmentVariable('DATABASE_PASSWORD'),
  database: requiredEnvironmentVariable('DATABASE_NAME'),
  entities: [`${__dirname}/**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
});
