const reportService = require('../services/report.service');

class ReportController {
  async index(req, res, next) {
    try { res.json(await reportService.getReports()); } catch (error) { next(error); }
  }
}

module.exports = new ReportController();
