const db = require('../config/db');

function mapClient(row) {
  return {
    id: Number(row.id_cliente),
    name: row.nombre,
    document: row.documento || '',
    phone: row.telefono || '',
    email: row.email || '',
    address: row.direccion || '',
    active: row.activo
  };
}

class ClientRepository {
  async findAll() {
    const result = await db.query(
      `SELECT id_cliente, nombre, documento, telefono, email, direccion, activo
       FROM clientes
       WHERE activo = TRUE
       ORDER BY id_cliente`
    );
    return result.rows.map(mapClient);
  }

  async findById(id) {
    const result = await db.query(
      `SELECT id_cliente, nombre, documento, telefono, email, direccion, activo
       FROM clientes
       WHERE id_cliente = $1`,
      [id]
    );
    return result.rows[0] ? mapClient(result.rows[0]) : null;
  }


  async findByDocument(document) {
    const result = await db.query(
      `SELECT id_cliente, nombre, documento, telefono, email, direccion, activo
       FROM clientes
       WHERE documento = $1
       LIMIT 1`,
      [document]
    );
    return result.rows[0] ? mapClient(result.rows[0]) : null;
  }

  async existsByDocument(document, ignoreId = null) {
    const result = await db.query(
      `SELECT 1
       FROM clientes
       WHERE documento = $1
         AND ($2::INT IS NULL OR id_cliente <> $2::INT)
       LIMIT 1`,
      [document, ignoreId]
    );
    return result.rowCount > 0;
  }

  async create(data) {
    const result = await db.query(
      `INSERT INTO clientes (nombre, documento, telefono, email, direccion, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id_cliente, nombre, documento, telefono, email, direccion, activo`,
      [data.name, data.document, data.phone || '', data.email || '', data.address || '']
    );
    return mapClient(result.rows[0]);
  }

  async update(id, data) {
    const result = await db.query(
      `UPDATE clientes
       SET nombre = $1, documento = $2, telefono = $3, email = $4, direccion = $5
       WHERE id_cliente = $6 AND activo = TRUE
       RETURNING id_cliente, nombre, documento, telefono, email, direccion, activo`,
      [data.name, data.document, data.phone || '', data.email || '', data.address || '', id]
    );
    return result.rows[0] ? mapClient(result.rows[0]) : null;
  }

  async removeById(id) {
    const result = await db.query(
      `UPDATE clientes SET activo = FALSE WHERE id_cliente = $1 RETURNING id_cliente`,
      [id]
    );
    return result.rowCount > 0;
  }
}

module.exports = new ClientRepository();
