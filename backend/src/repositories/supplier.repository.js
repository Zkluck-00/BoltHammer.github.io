const db = require('../config/db');

function mapSupplier(row) {
  return {
    id: Number(row.id_proveedor),
    company: row.empresa,
    ruc: row.ruc || '',
    phone: row.telefono || '',
    email: row.email || '',
    address: row.direccion || '',
    active: row.activo
  };
}

class SupplierRepository {
  async findAll() {
    const result = await db.query(
      `SELECT id_proveedor, empresa, ruc, telefono, email, direccion, activo
       FROM proveedores
       WHERE activo = TRUE
       ORDER BY empresa`
    );
    return result.rows.map(mapSupplier);
  }

  async findById(id) {
    const result = await db.query(
      `SELECT id_proveedor, empresa, ruc, telefono, email, direccion, activo
       FROM proveedores
       WHERE id_proveedor = $1`,
      [id]
    );
    return result.rows[0] ? mapSupplier(result.rows[0]) : null;
  }

  async existsByRuc(ruc, ignoreId = null) {
    const result = await db.query(
      `SELECT 1
       FROM proveedores
       WHERE ruc = $1
         AND ($2::INT IS NULL OR id_proveedor <> $2::INT)
       LIMIT 1`,
      [ruc, ignoreId]
    );
    return result.rowCount > 0;
  }

  async create(data) {
    const result = await db.query(
      `INSERT INTO proveedores (empresa, ruc, telefono, email, direccion, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id_proveedor, empresa, ruc, telefono, email, direccion, activo`,
      [data.company, data.ruc, data.phone || '', data.email || '', data.address || '']
    );
    return mapSupplier(result.rows[0]);
  }

  async update(id, data) {
    const result = await db.query(
      `UPDATE proveedores
       SET empresa = $1, ruc = $2, telefono = $3, email = $4, direccion = $5
       WHERE id_proveedor = $6 AND activo = TRUE
       RETURNING id_proveedor, empresa, ruc, telefono, email, direccion, activo`,
      [data.company, data.ruc, data.phone || '', data.email || '', data.address || '', id]
    );
    return result.rows[0] ? mapSupplier(result.rows[0]) : null;
  }

  async hasProducts(id) {
    const result = await db.query(
      `SELECT 1 FROM productos WHERE id_proveedor = $1 AND activo = TRUE LIMIT 1`,
      [id]
    );
    return result.rowCount > 0;
  }

  async removeById(id) {
    const result = await db.query(
      `UPDATE proveedores SET activo = FALSE WHERE id_proveedor = $1 RETURNING id_proveedor`,
      [id]
    );
    return result.rowCount > 0;
  }
}

module.exports = new SupplierRepository();
