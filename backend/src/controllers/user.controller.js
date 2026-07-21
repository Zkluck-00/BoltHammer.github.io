const userService = require('../services/user.service');

class UserController {
  async index(req, res, next) {
    try { res.json(await userService.getAll()); } catch (error) { next(error); }
  }

  async create(req, res, next) {
    try { res.status(201).json(await userService.create(req.body)); } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try { res.json(await userService.update(req.params.id, req.body)); } catch (error) { next(error); }
  }

  async delete(req, res, next) {
    try { res.json(await userService.delete(req.params.id, req.user)); } catch (error) { next(error); }
  }
}

module.exports = new UserController();
