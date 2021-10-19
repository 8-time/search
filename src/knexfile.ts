import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '..', '.env.local'),
});

const config = {
  client: 'sqlite3',
  connection: {
    filename: process.env.DB_FILE_NAME,
  },
  migrations: {
    tableName: 'migrations',
  },
  debug: process.env.NODE_ENV === 'development',
  asyncStackTraces: process.env.NODE_ENV === 'development',
};

module.exports = {
  development: {
    ...config,
  },
  staging: {
    ...config,
  },
  production: {
    ...config,
  },
};
