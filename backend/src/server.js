const env = require('./config/env');
const app = require('./app');
const db = require('./config/db');

const server = app.listen(env.port, async () => {
  console.log(`Bolt & Hammer disponible en http://localhost:${env.port}`);
  console.log(`Estado de la API: http://localhost:${env.port}/api/health`);

  try {
    const connection = await db.testConnection();
    console.log(`PostgreSQL conectado: ${connection.database} (${connection.database_user})`);
  } catch (error) {
    console.error('El servidor web inicio, pero PostgreSQL/Neon no esta disponible.');
    console.error(`Codigo: ${error.code || 'SIN_CODIGO'} | Detalle: ${error.message}`);
    console.error(`Revisa la conexion ejecutando: npm run db:test`);
  }
});

async function shutdown(signal) {
  console.log(`\n${signal}: cerrando Bolt & Hammer...`);
  server.close(async () => {
    try {
      await db.close();
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
