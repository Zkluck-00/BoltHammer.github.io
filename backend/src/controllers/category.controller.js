const categoryService = require('../services/category.service');

class CategoryController {
  async index(req, res, next) {
    try { res.json(await categoryService.getAll()); } catch (error) { next(error); }
  }

  async create(req, res, next) {
    try { res.status(201).json(await categoryService.create(req.body)); } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try { res.json(await categoryService.update(req.params.id, req.body)); } catch (error) { next(error); }
  }

  async delete(req, res, next) {
    try { res.json(await categoryService.delete(req.params.id)); } catch (error) { next(error); }
  }
}

module.exports = new CategoryController();
