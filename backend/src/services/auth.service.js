const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/user.repository');
const { publicUser } = require('../utils/user');
const httpError = require('../utils/httpError');

class AuthService {
  makeToken(user) {
    return jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn, issuer: 'bolt-hammer-api' }
    );
  }

  readToken(token) {
    try {
      return jwt.verify(token, env.jwtSecret, { issuer: 'bolt-hammer-api' });
    } catch {
      return null;
    }
  }

  async login(username, password) {
    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(password || '');
    if (!cleanUsername || !cleanPassword) {
      throw httpError('Usuario y contrasena son obligatorios.', 400);
    }

    const user = await userRepository.findActiveByUsername(cleanUsername);
    if (!user) throw httpError('Usuario o contrasena incorrectos.', 401);

    const stored = String(user.passwordHash || '');
    const usesBcrypt = stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$');
    const valid = usesBcrypt
      ? await bcrypt.compare(cleanPassword, stored)
      : cleanPassword === stored;

    if (!valid) throw httpError('Usuario o contrasena incorrectos.', 401);

    if (!usesBcrypt) {
      const migratedHash = await bcrypt.hash(cleanPassword, 12);
      await userRepository.updatePasswordHash(user.id, migratedHash);
    }

    return { token: this.makeToken(user), user: publicUser(user) };
  }

  async getAuthenticatedUser(token) {
    if (!token) throw httpError('Debes iniciar sesion.', 401);
    const payload = this.readToken(token);
    if (!payload?.sub) throw httpError('Sesion vencida o no valida. Inicia sesion nuevamente.', 401);

    const user = await userRepository.findById(payload.sub);
    if (!user || !user.active) throw httpError('Usuario inactivo o inexistente.', 401);

    return { user: publicUser(user) };
  }
}

module.exports = new AuthService();
