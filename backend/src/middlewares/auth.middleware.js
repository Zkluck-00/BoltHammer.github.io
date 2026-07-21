const authService = require('../services/auth.service');

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const session = await authService.getAuthenticatedUser(token);
    req.user = session.user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = auth;
