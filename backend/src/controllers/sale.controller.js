const saleService = require('../services/sale.service');

class SaleController {
  async index(req, res, next) {
    try { res.json(await saleService.getAll()); } catch (error) { next(error); }
  }

  async create(req, res, next) {
    try { res.status(201).json(await saleService.create(req.body, req.user)); } catch (error) { next(error); }
  }
}

module.exports = new SaleController();
