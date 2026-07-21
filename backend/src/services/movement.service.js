const productRepository = require('../repositories/product.repository');
const movementRepository = require('../repositories/movement.repository');
const MovementFactory = require('../factories/movement.factory');
const { toNumber } = require('../utils/validators');
const httpError = require('../utils/httpError');

class MovementService {
  async getAll() {
    return movementRepository.findNewestFirst();
  }

  async createManual(data, user) {
    const product = await productRepository.findById(data.productId);
    if (!product || product.active === false) throw httpError('Producto no encontrado.', 404);

    const type = String(data.type || '').trim().toUpperCase();
    const quantity = toNumber(data.quantity, 'cantidad', type === 'AJUSTE' ? 0 : 1);
    const reason = String(data.reason || '').trim() || 'Movimiento manual';

    if (!['ENTRADA', 'AJUSTE'].includes(type)) throw httpError('Tipo de movimiento no valido.', 400);

    const movement = MovementFactory.create(type, {
      product,
      quantity,
      reason,
      user
    });

    return movementRepository.create(movement);
  }
}

module.exports = new MovementService();
