const httpError = require('../utils/httpError');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(httpError('No tienes permisos para realizar esta accion.', 403));
    }
    next();
  };
}

module.exports = requireRole;
