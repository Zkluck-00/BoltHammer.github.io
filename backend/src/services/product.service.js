const db = require('../config/db');
const productRepository = require('../repositories/product.repository');
const categoryRepository = require('../repositories/category.repository');
const supplierRepository = require('../repositories/supplier.repository');
const movementRepository = require('../repositories/movement.repository');
const MovementFactory = require('../factories/movement.factory');
const { validateRequired, toNumber } = require('../utils/validators');
const httpError = require('../utils/httpError');

class ProductService {
  async getAll() {
    return productRepository.findActive();
  }

  async create(data, user) {
    const productData = this.mapProductData(data);
    validateRequired({ code: productData.code, name: productData.name, categoryId: productData.categoryId });
    await this.validateReferences(productData);
    if (await productRepository.existsByCode(productData.code)) throw httpError('El codigo de producto ya existe.', 409);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const initialStock = productData.stock;
      const product = await productRepository.create({ ...productData, stock: 0 }, client);

      if (initialStock > 0) {
        const movement = MovementFactory.create('ENTRADA', {
          product,
          quantity: initialStock,
          reason: 'Registro inicial del producto',
          user
        });
        await movementRepository.create(movement, client);
      }

      await client.query('COMMIT');
      return productRepository.findById(product.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id, data, user) {
    const current = await productRepository.findById(id);
    if (!current || current.active === false) throw httpError('Producto no encontrado.', 404);

    const productData = this.mapProductData(data);
    validateRequired({ code: productData.code, name: productData.name, categoryId: productData.categoryId });
    await this.validateReferences(productData);
    if (await productRepository.existsByCode(productData.code, current.id)) throw httpError('El codigo de producto ya existe.', 409);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await productRepository.update(id, productData, client);

      if (Number(current.stock) !== Number(productData.stock)) {
        const productAfterUpdate = await productRepository.findById(id, client);
        const movement = MovementFactory.create('AJUSTE', {
          product: productAfterUpdate,
          quantity: productData.stock,
          reason: 'Ajuste de stock desde edicion de producto',
          user: user || { id: 1, name: 'Sistema' }
        });
        await movementRepository.create(movement, client);
      }

      await client.query('COMMIT');
      return productRepository.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id) {
    const product = await productRepository.findById(id);
    if (!product) throw httpError('Producto no encontrado.', 404);
    await productRepository.softDelete(id);
    return { ok: true };
  }

  mapProductData(data) {
    return {
      code: String(data.code || '').trim(),
      name: String(data.name || '').trim(),
      description: String(data.description || '').trim(),
      categoryId: Number(data.categoryId),
      supplierId: Number(data.supplierId || 0) || null,
      stock: toNumber(data.stock, 'stock'),
      minStock: toNumber(data.minStock, 'stock minimo'),
      buyPrice: toNumber(data.buyPrice, 'precio de compra'),
      salePrice: toNumber(data.salePrice, 'precio de venta')
    };
  }

  async validateReferences(productData) {
    if (!await categoryRepository.findById(productData.categoryId)) {
      throw httpError('La categoria seleccionada no existe.', 400);
    }
    if (productData.supplierId && !await supplierRepository.findById(productData.supplierId)) {
      throw httpError('El proveedor seleccionado no existe.', 400);
    }
  }
}

module.exports = new ProductService();
