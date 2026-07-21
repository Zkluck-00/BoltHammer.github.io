const db = require('../config/db');

function mapCategory(row) {
  return {
    id: Number(row.id_categoria),
    name: row.nombre,
    description: row.descripcion || '',
    active: row.activo
  };
}

class CategoryRepository {
  async findAll() {
    const result = await db.query(
      `SELECT id_categoria, nombre, descripcion, activo
       FROM categorias
       WHERE activo = TRUE
       ORDER BY nombre`
    );
    return result.rows.map(mapCategory);
  }

  async findById(id) {
    const result = await db.query(
      `SELECT id_categoria, nombre, descripcion, activo
       FROM categorias
       WHERE id_categoria = $1`,
      [id]
    );
    return result.rows[0] ? mapCategory(result.rows[0]) : null;
  }

  async existsByName(name, ignoreId = null) {
    const result = await db.query(
      `SELECT 1
       FROM categorias
       WHERE LOWER(nombre) = LOWER($1)
         AND ($2::INT IS NULL OR id_categoria <> $2::INT)
       LIMIT 1`,
      [name, ignoreId]
    );
    return result.rowCount > 0;
  }

  async create(data) {
    const result = await db.query(
      `INSERT INTO categorias (nombre, descripcion, activo)
       VALUES ($1, $2, TRUE)
       RETURNING id_categoria, nombre, descripcion, activo`,
      [data.name, data.description || '']
    );
    return mapCategory(result.rows[0]);
  }

  async update(id, data) {
    const result = await db.query(
      `UPDATE categorias
       SET nombre = $1, descripcion = $2
       WHERE id_categoria = $3 AND activo = TRUE
       RETURNING id_categoria, nombre, descripcion, activo`,
      [data.name, data.description || '', id]
    );
    return result.rows[0] ? mapCategory(result.rows[0]) : null;
  }

  async hasProducts(id) {
    const result = await db.query(
      `SELECT 1 FROM productos WHERE id_categoria = $1 AND activo = TRUE LIMIT 1`,
      [id]
    );
    return result.rowCount > 0;
  }

  async removeById(id) {
    const result = await db.query(
      `UPDATE categorias SET activo = FALSE WHERE id_categoria = $1 RETURNING id_categoria`,
      [id]
    );
    return result.rowCount > 0;
  }
}

module.exports = new CategoryRepository();
