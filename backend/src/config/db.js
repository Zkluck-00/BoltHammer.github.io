const { Pool } = require('pg');
const env = require('./env');

function buildConnectionConfig(connectionString) {
  let enableChannelBinding = false;
  let normalizedConnectionString = connectionString;

  try {
    const url = new URL(connectionString);
    enableChannelBinding = url.searchParams.get('channel_binding') === 'require';
    url.searchParams.delete('channel_binding');

    // pg 8 trata sslmode=require como verify-full. Se explicita para evitar
    // advertencias y conservar la verificacion del certificado del servidor.
    if (url.searchParams.get('sslmode') === 'require') {
      url.searchParams.set('sslmode', 'verify-full');
    }
    normalizedConnectionString = url.toString();
  } catch {
    throw new Error('DATABASE_URL no tiene un formato PostgreSQL valido.');
  }

  return {
    connectionString: normalizedConnectionString,
    enableChannelBinding,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10
  };
}

const pool = new Pool(buildConnectionConfig(env.databaseUrl));

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

async function testConnection() {
  const result = await query(`
    SELECT
      NOW() AS now,
      CURRENT_DATABASE() AS database,
      CURRENT_USER AS database_user
  `);
  return result.rows[0];
}

async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  close
};
