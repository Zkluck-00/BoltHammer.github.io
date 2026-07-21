const db = require('../config/db');

async function run() {
  try {
    const result = await db.testConnection();
    console.log('Conexion a PostgreSQL/Neon correcta.');
    console.log(`Base de datos: ${result.database}`);
    console.log(`Usuario: ${result.database_user}`);
    console.log(`Hora del servidor: ${result.now}`);
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL/Neon.');
    console.error(`Codigo: ${error.code || 'SIN_CODIGO'}`);
    console.error(`Detalle: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await db.close().catch(() => {});
  }
}

run();
