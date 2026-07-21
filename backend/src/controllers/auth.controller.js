const authService = require('../services/auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      res.json(await authService.login(username, password));
    } catch (error) {
      next(error);
    }
  }

  me(req, res) {
    res.json({ user: req.user });
  }
}

module.exports = new AuthController();
