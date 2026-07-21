function normalizePayment(method) {
  const value = String(method || '').trim().toUpperCase();
  if (value.includes('EFECTIVO')) return 'EFECTIVO';
  if (value.includes('TARJETA')) return 'TARJETA';
  if (value.includes('YAPE')) return 'YAPE';
  if (value.includes('PLIN')) return 'PLIN';
  if (value.includes('TRANSFER')) return 'TRANSFERENCIA';
  if (value.includes('CREDITO') || value.includes('CRÉDITO')) return 'CREDITO';
  return 'EFECTIVO';
}

class CashPaymentStrategy {
  process(total) {
    return {
      databaseType: 'EFECTIVO',
      method: 'Efectivo',
      total,
      status: 'PAGADO',
      message: 'Pago registrado en efectivo.'
    };
  }
}

class CardPaymentStrategy {
  process(total) {
    return {
      databaseType: 'TARJETA',
      method: 'Tarjeta',
      total,
      status: 'PAGADO',
      message: 'Pago registrado con tarjeta.'
    };
  }
}

class DigitalPaymentStrategy {
  constructor(databaseType, label) {
    this.databaseType = databaseType;
    this.label = label;
  }

  process(total) {
    return {
      databaseType: this.databaseType,
      method: this.label,
      total,
      status: 'PAGADO',
      message: 'Pago registrado mediante billetera digital.'
    };
  }
}

class TransferPaymentStrategy {
  process(total) {
    return {
      databaseType: 'TRANSFERENCIA',
      method: 'Transferencia',
      total,
      status: 'PAGADO',
      message: 'Pago registrado por transferencia.'
    };
  }
}

class CreditPaymentStrategy {
  process(total) {
    return {
      databaseType: 'CREDITO',
      method: 'Credito',
      total,
      status: 'PENDIENTE',
      message: 'Venta registrada como credito pendiente.'
    };
  }
}

class PaymentStrategy {
  static getStrategy(method) {
    const normalized = normalizePayment(method);

    if (normalized === 'EFECTIVO') return new CashPaymentStrategy();
    if (normalized === 'TARJETA') return new CardPaymentStrategy();
    if (normalized === 'YAPE') return new DigitalPaymentStrategy('YAPE', 'Yape/Plin');
    if (normalized === 'PLIN') return new DigitalPaymentStrategy('PLIN', 'Yape/Plin');
    if (normalized === 'TRANSFERENCIA') return new TransferPaymentStrategy();
    if (normalized === 'CREDITO') return new CreditPaymentStrategy();

    return new CashPaymentStrategy();
  }
}

module.exports = PaymentStrategy;
