import dotenv from 'dotenv';
dotenv.config();

const required = ['PORT', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

export const env = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_ORIGIN: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()),
  ADMIN_CLIENT_ORIGIN: (process.env.ADMIN_CLIENT_ORIGIN || 'http://localhost:5174').split(',').map(s => s.trim()),
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ADMIN_AUDIENCE: 'collavo-admin',
  JWT_USER_AUDIENCE: 'collavo-user',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  ADMIN_ROUTE_PATH: process.env.ADMIN_ROUTE_PATH || 'ops-9f3k2',
  AZURE_BLOB_CONNECTION_STRING: process.env.AZURE_BLOB_CONNECTION_STRING,
  AZURE_BLOB_PRIVATE_CONTAINER: process.env.AZURE_BLOB_PRIVATE_CONTAINER || 'collavo-private',
  AZURE_KEYVAULT_URL: process.env.AZURE_KEYVAULT_URL,
  AUTO_RELEASE_DAYS: Number(process.env.AUTO_RELEASE_DAYS || 7),
  ESCROW_AUTO_RELEASE_DAYS: Number(process.env.ESCROW_AUTO_RELEASE_DAYS || 7),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'
};

const missing = required.filter(k => !env[k]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
