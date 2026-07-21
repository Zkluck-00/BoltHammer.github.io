const clientService = require('../services/client.service');

class ClientController {
  async index(req, res, next) {
    try { res.json(await clientService.getAll()); } catch (error) { next(error); }
  }

  async create(req, res, next) {
    try { res.status(201).json(await clientService.create(req.body)); } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try { res.json(await clientService.update(req.params.id, req.body)); } catch (error) { next(error); }
  }

  async delete(req, res, next) {
    try { res.json(await clientService.delete(req.params.id)); } catch (error) { next(error); }
  }
}

module.exports = new ClientController();
