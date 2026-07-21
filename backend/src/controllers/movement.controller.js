const movementService = require('../services/movement.service');

class MovementController {
  async index(req, res, next) {
    try { res.json(await movementService.getAll()); } catch (error) { next(error); }
  }

  async create(req, res, next) {
    try { res.status(201).json(await movementService.createManual(req.body, req.user)); } catch (error) { next(error); }
  }
}

module.exports = new MovementController();
