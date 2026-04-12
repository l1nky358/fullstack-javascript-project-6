import knex from 'knex';
import { Model } from 'objection';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

let knexConfig;

if (isTest) {
  // In-memory SQLite для тестов
  knexConfig = {
    client: 'sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../migrations'),
    },
    seeds: {
      directory: path.join(__dirname, '../seeds'),
    },
  };
} else if (isProduction) {
  // PostgreSQL для продакшена
  knexConfig = {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    migrations: {
      directory: path.join(__dirname, '../migrations'),
    },
  };
} else {
  // SQLite для разработки
  knexConfig = {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../../database.sqlite'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../migrations'),
    },
  };
}

const knexInstance = knex(knexConfig);
Model.knex(knexInstance);

export default knexInstance;
