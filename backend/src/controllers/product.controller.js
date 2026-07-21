const productService = require('../services/product.service');

class ProductController {
  async index(req, res, next) {
    try { res.json(await productService.getAll()); } catch (error) { next(error); }
  }

  async create(req, res, next) {
    try { res.status(201).json(await productService.create(req.body, req.user)); } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try { res.json(await productService.update(req.params.id, req.body, req.user)); } catch (error) { next(error); }
  }

  async delete(req, res, next) {
    try { res.json(await productService.delete(req.params.id)); } catch (error) { next(error); }
  }
}

module.exports = new ProductController();
