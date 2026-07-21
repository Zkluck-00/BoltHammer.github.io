const dashboardService = require('../services/dashboard.service');

class DashboardController {
  async index(req, res, next) {
    try { res.json(await dashboardService.getSummary()); } catch (error) { next(error); }
  }
}

module.exports = new DashboardController();
