const db = require('../config/db');

function paymentLabel(value) {
  const labels = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    YAPE: 'Yape/Plin',
    PLIN: 'Yape/Plin',
    TRANSFERENCIA: 'Transferencia',
    CREDITO: 'Credito'
  };
  return labels[value] || value;
}

function mapSale(row) {
  return {
    id: Number(row.id_venta),
    date: row.fecha_texto,
    clientId: row.id_cliente ? Number(row.id_cliente) : null,
    clientName: row.cliente_nombre || 'Cliente general',
    sellerId: Number(row.id_vendedor),
    sellerName: row.vendedor_nombre || '',
    payment: paymentLabel(row.tipo_pago),
    paymentStatus: row.estado_pago,
    paymentMessage: row.mensaje_pago || '',
    total: Number(row.total || 0),
    items: []
  };
}

function mapItem(row) {
  return {
    productId: Number(row.id_producto),
    code: row.codigo,
    name: row.nombre_producto,
    qty: Number(row.cantidad || 0),
    price: Number(row.precio_unitario || 0),
    subtotal: Number(row.subtotal || 0)
  };
}

class SaleRepository {
  async findNewestFirst() {
    const result = await db.query(
      `SELECT
        v.id_venta,
        v.id_cliente,
        v.id_vendedor,
        TO_CHAR(v.fecha_venta, 'YYYY-MM-DD HH24:MI') AS fecha_texto,
        v.tipo_pago,
        v.estado_pago,
        v.mensaje_pago,
        v.total,
        c.nombre AS cliente_nombre,
        u.nombre AS vendedor_nombre
       FROM ventas v
       LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
       INNER JOIN usuarios u ON u.id_usuario = v.id_vendedor
       WHERE v.anulada = FALSE
       ORDER BY v.id_venta DESC`
    );

    const sales = result.rows.map(mapSale);
    if (!sales.length) return sales;

    const detailResult = await db.query(
      `SELECT id_venta, id_producto, codigo, nombre_producto, cantidad, precio_unitario, subtotal
       FROM detalle_ventas
       WHERE id_venta = ANY($1::INT[])
       ORDER BY id_detalle`,
      [sales.map(sale => sale.id)]
    );

    const bySale = new Map(sales.map(sale => [sale.id, sale]));
    for (const row of detailResult.rows) {
      bySale.get(Number(row.id_venta))?.items.push(mapItem(row));
    }

    return sales;
  }

  async findById(id, client = db) {
    const result = await client.query(
      `SELECT
        v.id_venta,
        v.id_cliente,
        v.id_vendedor,
        TO_CHAR(v.fecha_venta, 'YYYY-MM-DD HH24:MI') AS fecha_texto,
        v.tipo_pago,
        v.estado_pago,
        v.mensaje_pago,
        v.total,
        c.nombre AS cliente_nombre,
        u.nombre AS vendedor_nombre
       FROM ventas v
       LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
       INNER JOIN usuarios u ON u.id_usuario = v.id_vendedor
       WHERE v.id_venta = $1`,
      [id]
    );

    if (!result.rows[0]) return null;
    const sale = mapSale(result.rows[0]);
    const detailResult = await client.query(
      `SELECT id_producto, codigo, nombre_producto, cantidad, precio_unitario, subtotal
       FROM detalle_ventas
       WHERE id_venta = $1
       ORDER BY id_detalle`,
      [id]
    );
    sale.items = detailResult.rows.map(mapItem);
    return sale;
  }

  async create(data, client = db) {
    const result = await client.query(
      `INSERT INTO ventas (id_cliente, id_vendedor, tipo_pago, estado_pago, mensaje_pago)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_venta`,
      [data.clientId || null, data.sellerId, data.paymentType, data.paymentStatus, data.paymentMessage]
    );
    return result.rows[0].id_venta;
  }

  async addItem(saleId, item, client = db) {
    await client.query(
      `INSERT INTO detalle_ventas (id_venta, id_producto, codigo, nombre_producto, cantidad, precio_unitario, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [saleId, item.productId, item.code, item.name, item.qty, item.price, item.subtotal]
    );
  }
}

module.exports = new SaleRepository();
