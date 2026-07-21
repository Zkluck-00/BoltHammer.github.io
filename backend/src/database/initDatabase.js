const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.warn('ATENCION: db:init recrea las tablas y elimina los datos existentes.');
  await db.query(sql);
  console.log('Base de datos inicializada correctamente.');
}

if (require.main === module) {
  initDatabase()
    .then(async () => {
      await db.close();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Error inicializando la base de datos:', error.message);
      console.error('Codigo:', error.code || 'SIN_CODIGO');
      await db.close().catch(() => {});
      process.exit(1);
    });
}

module.exports = initDatabase;
