const db = require('../config/db');
const saleRepository = require('../repositories/sale.repository');
const productRepository = require('../repositories/product.repository');
const clientRepository = require('../repositories/client.repository');
const movementRepository = require('../repositories/movement.repository');
const MovementFactory = require('../factories/movement.factory');
const PaymentStrategy = require('../strategies/payment.strategy');
const { validateRequired, toNumber } = require('../utils/validators');
const httpError = require('../utils/httpError');

class SaleService {
  async getAll() {
    return saleRepository.findNewestFirst();
  }

  async create(data, user) {
    const clientId = Number(data.clientId || 0) || null;
    const payment = String(data.payment || '').trim();
    const items = Array.isArray(data.items) ? data.items : [];

    validateRequired({ payment });
    if (!items.length) throw httpError('Agrega al menos un producto a la venta.', 400);

    const selectedClient = clientId ? await clientRepository.findById(clientId) : null;
    const client = selectedClient || await clientRepository.findByDocument('00000000');
    if (!client || client.active === false) throw httpError('No existe un cliente general activo. Inicializa la base de datos.', 500);

    const clientPg = await db.getClient();
    try {
      await clientPg.query('BEGIN');

      const saleItems = await this.buildSaleItems(items, clientPg);
      const total = saleItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      const paymentResult = PaymentStrategy.getStrategy(payment).process(total, payment);

      const saleId = await saleRepository.create({
        clientId: client.id,
        sellerId: user.id,
        paymentType: paymentResult.databaseType,
        paymentStatus: paymentResult.status,
        paymentMessage: paymentResult.message
      }, clientPg);

      for (const item of saleItems) {
        await saleRepository.addItem(saleId, item, clientPg);
        const movement = MovementFactory.create('SALIDA', {
          product: item.product,
          quantity: item.qty,
          reason: 'Venta registrada',
          user,
          saleId
        });
        await movementRepository.create(movement, clientPg);
      }

      await clientPg.query('COMMIT');
      return saleRepository.findById(saleId);
    } catch (error) {
      await clientPg.query('ROLLBACK');
      throw error;
    } finally {
      clientPg.release();
    }
  }

  async buildSaleItems(items, client) {
    const saleItems = [];

    for (const item of items) {
      const product = await productRepository.findById(item.productId, client);
      const qty = toNumber(item.qty, 'cantidad', 1);

      if (!product || product.active === false) throw httpError('Uno de los productos no existe.', 404);
      if (Number(product.stock) < qty) throw httpError(`Stock insuficiente para ${product.name}.`, 409);

      const price = Number(product.salePrice || 0);
      const subtotal = qty * price;

      saleItems.push({
        productId: product.id,
        code: product.code,
        name: product.name,
        qty,
        price,
        subtotal,
        product
      });
    }

    return saleItems;
  }
}

module.exports = new SaleService();
