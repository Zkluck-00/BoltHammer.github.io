const db = require('../config/db');

function mapProduct(row) {
  return {
    id: Number(row.id_producto),
    code: row.codigo,
    name: row.nombre,
    description: row.descripcion || '',
    categoryId: Number(row.id_categoria),
    supplierId: row.id_proveedor === null ? null : Number(row.id_proveedor),
    stock: Number(row.stock_actual || 0),
    minStock: Number(row.stock_minimo || 0),
    buyPrice: Number(row.precio_compra || 0),
    salePrice: Number(row.precio_venta || 0),
    active: row.activo,
    categoryName: row.categoria_nombre || row.category_name || 'Sin categoria',
    supplierName: row.proveedor_nombre || row.supplier_name || 'Sin proveedor'
  };
}

const PRODUCT_SELECT = `
  SELECT
    p.id_producto,
    p.id_categoria,
    p.id_proveedor,
    p.codigo,
    p.nombre,
    p.descripcion,
    p.stock_actual,
    p.stock_minimo,
    p.precio_compra,
    p.precio_venta,
    p.activo,
    c.nombre AS categoria_nombre,
    pr.empresa AS proveedor_nombre
  FROM productos p
  INNER JOIN categorias c ON c.id_categoria = p.id_categoria
  LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
`;

class ProductRepository {
  async findAll() {
    const result = await db.query(`${PRODUCT_SELECT} ORDER BY p.nombre`);
    return result.rows.map(mapProduct);
  }

  async findActive() {
    const result = await db.query(`${PRODUCT_SELECT} WHERE p.activo = TRUE ORDER BY p.nombre`);
    return result.rows.map(mapProduct);
  }

  async findById(id, client = db) {
    const result = await client.query(`${PRODUCT_SELECT} WHERE p.id_producto = $1`, [id]);
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async existsByCode(code, ignoreId = null) {
    const result = await db.query(
      `SELECT 1
       FROM productos
       WHERE LOWER(codigo) = LOWER($1)
         AND ($2::INT IS NULL OR id_producto <> $2::INT)
       LIMIT 1`,
      [code, ignoreId]
    );
    return result.rowCount > 0;
  }

  async create(data, client = db) {
    const result = await client.query(
      `INSERT INTO productos (
        id_categoria, id_proveedor, codigo, nombre, descripcion,
        stock_actual, stock_minimo, precio_compra, precio_venta, activo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
       RETURNING id_producto`,
      [
        data.categoryId,
        data.supplierId || null,
        data.code,
        data.name,
        data.description || '',
        data.stock || 0,
        data.minStock,
        data.buyPrice,
        data.salePrice
      ]
    );
    return this.findById(result.rows[0].id_producto, client);
  }

  async update(id, data, client = db) {
    const result = await client.query(
      `UPDATE productos
       SET id_categoria = $1,
           id_proveedor = $2,
           codigo = $3,
           nombre = $4,
           descripcion = $5,
           stock_minimo = $6,
           precio_compra = $7,
           precio_venta = $8
       WHERE id_producto = $9 AND activo = TRUE
       RETURNING id_producto`,
      [
        data.categoryId,
        data.supplierId || null,
        data.code,
        data.name,
        data.description || '',
        data.minStock,
        data.buyPrice,
        data.salePrice,
        id
      ]
    );
    return result.rows[0] ? this.findById(id, client) : null;
  }

  async softDelete(id) {
    const result = await db.query(
      `UPDATE productos SET activo = FALSE WHERE id_producto = $1 RETURNING id_producto`,
      [id]
    );
    return result.rowCount > 0;
  }
}

module.exports = new ProductRepository();
module.exports.mapProduct = mapProduct;
