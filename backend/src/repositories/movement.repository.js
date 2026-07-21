const db = require('../config/db');

function mapMovement(row) {
  return {
    id: Number(row.id_movimiento),
    productId: Number(row.id_producto),
    productName: row.nombre_producto,
    type: row.tipo,
    quantity: Number(row.cantidad || 0),
    reason: row.motivo || '',
    date: row.fecha_texto || row.fecha,
    userId: Number(row.id_usuario),
    userName: row.usuario_nombre || '',
    saleId: row.id_venta ? Number(row.id_venta) : null,
    previousStock: row.stock_anterior === null || row.stock_anterior === undefined ? null : Number(row.stock_anterior),
    newStock: row.stock_nuevo === null || row.stock_nuevo === undefined ? null : Number(row.stock_nuevo)
  };
}

const MOVEMENT_SELECT = `
  SELECT
    m.id_movimiento,
    m.id_producto,
    m.id_usuario,
    m.id_venta,
    m.nombre_producto,
    m.tipo,
    m.cantidad,
    m.motivo,
    m.stock_anterior,
    m.stock_nuevo,
    TO_CHAR(m.fecha, 'YYYY-MM-DD HH24:MI') AS fecha_texto,
    u.nombre AS usuario_nombre
  FROM movimientos_stock m
  INNER JOIN usuarios u ON u.id_usuario = m.id_usuario
`;

class MovementRepository {
  async findNewestFirst() {
    const result = await db.query(`${MOVEMENT_SELECT} ORDER BY m.id_movimiento DESC`);
    return result.rows.map(mapMovement);
  }

  async create(data, client = db) {
    const result = await client.query(
      `INSERT INTO movimientos_stock (
        id_producto, id_usuario, id_venta, nombre_producto, tipo, cantidad, motivo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_movimiento`,
      [
        data.productId,
        data.userId,
        data.saleId || null,
        data.productName,
        data.type,
        data.quantity,
        data.reason || ''
      ]
    );

    const selected = await client.query(`${MOVEMENT_SELECT} WHERE m.id_movimiento = $1`, [result.rows[0].id_movimiento]);
    return selected.rows[0] ? mapMovement(selected.rows[0]) : null;
  }
}

module.exports = new MovementRepository();
