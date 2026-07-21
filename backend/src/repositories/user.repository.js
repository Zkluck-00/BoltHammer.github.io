const db = require('../config/db');

function mapUser(row) {
  return {
    id: Number(row.id_usuario),
    name: row.nombre,
    username: row.username,
    passwordHash: row.password,
    role: row.rol_nombre || row.role,
    active: row.activo
  };
}

const USER_SELECT = `
  SELECT
    u.id_usuario,
    u.nombre,
    u.username,
    u.password,
    u.activo,
    r.nombre AS rol_nombre
  FROM usuarios u
  INNER JOIN roles r ON r.id_rol = u.id_rol
`;

class UserRepository {
  async findAll() {
    const result = await db.query(`${USER_SELECT} ORDER BY u.id_usuario`);
    return result.rows.map(mapUser);
  }

  async findById(id) {
    const result = await db.query(`${USER_SELECT} WHERE u.id_usuario = $1`, [id]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findActiveByUsername(username) {
    const result = await db.query(
      `${USER_SELECT}
       WHERE LOWER(u.username) = LOWER($1)
         AND u.activo = TRUE
       LIMIT 1`,
      [String(username || '').trim()]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async existsByUsername(username, ignoreId = null) {
    const result = await db.query(
      `SELECT 1
       FROM usuarios
       WHERE LOWER(username) = LOWER($1)
         AND ($2::INT IS NULL OR id_usuario <> $2::INT)
       LIMIT 1`,
      [username, ignoreId]
    );
    return result.rowCount > 0;
  }

  async getRoleId(role) {
    const result = await db.query(
      `SELECT id_rol FROM roles WHERE nombre = $1 AND activo = TRUE`,
      [role]
    );
    return result.rows[0]?.id_rol || null;
  }

  async create(data) {
    const roleId = await this.getRoleId(data.role);
    const result = await db.query(
      `INSERT INTO usuarios (id_rol, nombre, username, password, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_usuario`,
      [roleId, data.name, data.username, data.passwordHash, data.active !== false]
    );
    return this.findById(result.rows[0].id_usuario);
  }

  async update(id, data) {
    const roleId = await this.getRoleId(data.role);
    let result;

    if (String(data.passwordHash || '').trim()) {
      result = await db.query(
        `UPDATE usuarios
         SET id_rol = $1, nombre = $2, username = $3, password = $4, activo = $5
         WHERE id_usuario = $6
         RETURNING id_usuario`,
        [roleId, data.name, data.username, data.passwordHash, data.active, id]
      );
    } else {
      result = await db.query(
        `UPDATE usuarios
         SET id_rol = $1, nombre = $2, username = $3, activo = $4
         WHERE id_usuario = $5
         RETURNING id_usuario`,
        [roleId, data.name, data.username, data.active, id]
      );
    }

    return result.rows[0] ? this.findById(id) : null;
  }

  async updatePasswordHash(id, passwordHash) {
    await db.query(
      `UPDATE usuarios SET password = $1 WHERE id_usuario = $2`,
      [passwordHash, id]
    );
  }

  async deactivate(id) {
    const result = await db.query(
      `UPDATE usuarios SET activo = FALSE WHERE id_usuario = $1 RETURNING id_usuario`,
      [id]
    );
    return result.rowCount > 0;
  }
}

module.exports = new UserRepository();
