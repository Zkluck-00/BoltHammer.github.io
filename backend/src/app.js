const path = require('path');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const db = require('./config/db');
const apiRoutes = require('./routes');

const app = express();
const frontendPath = path.resolve(__dirname, '../../frontend');

const corsOptions = env.corsOrigin
  ? { origin: env.corsOrigin.split(',').map(value => value.trim()), credentials: false }
  : {};

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    const database = await db.testConnection();
    res.json({
      ok: true,
      app: 'Bolt & Hammer API',
      database: {
        connected: true,
        name: database.database,
        user: database.database_user,
        time: database.now
      }
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      app: 'Bolt & Hammer API',
      database: { connected: false },
      error: 'No se pudo conectar con PostgreSQL/Neon.',
      code: error.code || 'DATABASE_CONNECTION_ERROR'
    });
  }
});

app.use('/api', apiRoutes);
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada.' });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
  void next;
  const pgStatus = {
    '23505': 409,
    '23503': 409,
    '23514': 400,
    '22P02': 400
  };
  const connectionCodes = ['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', '57P01'];
  const status = err.status || pgStatus[err.code] || (connectionCodes.includes(err.code) ? 503 : 500);

  let message = err.message || 'Error interno del servidor.';
  if (!err.status && err.code === '23505') message = 'El registro ya existe o viola una restriccion unica.';
  if (!err.status && err.code === '23503') message = 'La operacion viola una relacion de la base de datos.';
  if (!err.status && err.code === '23514') message = 'Los datos no cumplen una restriccion de la base de datos.';
  if (!err.status && connectionCodes.includes(err.code)) message = 'No hay conexion con PostgreSQL/Neon. Revisa DATABASE_URL, Internet y DNS.';
  if (env.nodeEnv === 'production' && status === 500) message = 'Error interno del servidor.';

  if (status >= 500) console.error(err);
  res.status(status).json({ error: message, code: err.code || undefined });
});

module.exports = app;
