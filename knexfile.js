import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

let config;

if (isTest) {
  config = {
    client: 'sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src', 'migrations'),
    },
  };
} else if (isProduction) {
  config = {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    migrations: {
      directory: path.join(__dirname, 'src', 'migrations'),
    },
  };
} else {
  config = {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'database.sqlite'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src', 'migrations'),
    },
  };
}

export default config;