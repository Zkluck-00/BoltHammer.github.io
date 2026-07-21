class MovementFactory {
  static create(type, data) {
    const movementType = String(type || '').trim().toUpperCase();
    const descriptions = {
      ENTRADA: 'Ingreso de productos al inventario',
      SALIDA: 'Salida de productos por venta',
      AJUSTE: 'Ajuste manual de inventario'
    };

    if (!descriptions[movementType]) {
      throw new Error('Tipo de movimiento no valido.');
    }

    return {
      type: movementType,
      productId: data.product.id,
      productName: data.product.name,
      quantity: Number(data.quantity),
      reason: data.reason || descriptions[movementType],
      userId: data.user.id,
      userName: data.user.name,
      saleId: data.saleId || null
    };
  }
}

module.exports = MovementFactory;
