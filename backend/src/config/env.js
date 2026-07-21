const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath, quiet: true });

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`La variable ${name} no esta configurada. Revisa backend/.env`);
  }
  return value;
}

module.exports = {
  envPath,
  port: Number(process.env.PORT || 3000),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: String(process.env.JWT_EXPIRES_IN || '8h'),
  corsOrigin: String(process.env.CORS_ORIGIN || '').trim(),
  nodeEnv: String(process.env.NODE_ENV || 'development')
};
