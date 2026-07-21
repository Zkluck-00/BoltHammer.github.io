const supplierRepository = require('../repositories/supplier.repository');
const { validateRequired } = require('../utils/validators');
const httpError = require('../utils/httpError');

class SupplierService {
  async getAll() {
    return supplierRepository.findAll();
  }

  async create(data) {
    const supplier = this.mapSupplier(data);
    validateRequired({ company: supplier.company, ruc: supplier.ruc });
    if (await supplierRepository.existsByRuc(supplier.ruc)) throw httpError('Ya existe un proveedor con ese RUC.', 409);
    return supplierRepository.create(supplier);
  }

  async update(id, data) {
    const current = await supplierRepository.findById(id);
    if (!current || current.active === false) throw httpError('Proveedor no encontrado.', 404);

    const supplier = this.mapSupplier(data);
    validateRequired({ company: supplier.company, ruc: supplier.ruc });
    if (await supplierRepository.existsByRuc(supplier.ruc, current.id)) throw httpError('Ya existe un proveedor con ese RUC.', 409);
    return supplierRepository.update(id, supplier);
  }

  async delete(id) {
    if (await supplierRepository.hasProducts(id)) {
      throw httpError('No se puede eliminar un proveedor asociado a productos.', 409);
    }
    await supplierRepository.removeById(id);
    return { ok: true };
  }

  mapSupplier(data) {
    return {
      company: String(data.company || '').trim(),
      ruc: String(data.ruc || '').trim(),
      phone: String(data.phone || '').trim(),
      email: String(data.email || '').trim(),
      address: String(data.address || '').trim()
    };
  }
}

module.exports = new SupplierService();
