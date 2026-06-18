import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

// Determine if we should use connectionString (ignore if it contains placeholder 'xxxxxx')
const useConnectionString = connectionString && 
  !connectionString.includes('xxxxxxxxxxx') && 
  !connectionString.includes('xxxxxxxxx');

const connection = useConnectionString
  ? { 
      connectionString,
      ssl: connectionString.includes('127.0.0.1') || connectionString.includes('localhost') 
        ? false 
        : { rejectUnauthorized: false } 
    }
  : {
      host: process.env.POSTGRES_HOST || process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || process.env.DB_NAME || 'coworkingspace_db',
      user:     process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.POSTGRES_HOST && 
           process.env.POSTGRES_HOST !== '127.0.0.1' && 
           process.env.POSTGRES_HOST !== 'localhost'
        ? { rejectUnauthorized: false }
        : false
    };

const config = {
  development: {
    client: 'postgresql',
    connection,
    searchPath: ['tesis_medium', 'public'],
    pool: {
      min: 2,
      max: 10,
      afterCreate: function (conn, cb) {
        // Automatically create the tesis_medium schema if it doesn't exist
        // and set the connection search_path to search there first
        conn.query('CREATE SCHEMA IF NOT EXISTS tesis_medium; SET search_path TO tesis_medium, public;', function (err) {
          cb(err, conn);
        });
      }
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      schemaName: 'tesis_medium'
    },
    seeds: {
      directory: './seeds'
    }
  }
};

export default config;
