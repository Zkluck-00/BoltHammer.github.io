const supplierService = require('../services/supplier.service');

class SupplierController {
  async index(req, res, next) {
    try { res.json(await supplierService.getAll()); } catch (error) { next(error); }
  }

  async create(req, res, next) {
    try { res.status(201).json(await supplierService.create(req.body)); } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try { res.json(await supplierService.update(req.params.id, req.body)); } catch (error) { next(error); }
  }

  async delete(req, res, next) {
    try { res.json(await supplierService.delete(req.params.id)); } catch (error) { next(error); }
  }
}

module.exports = new SupplierController();
