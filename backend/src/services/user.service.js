const bcrypt = require('bcryptjs');
const ROLES = require('../config/roles');
const userRepository = require('../repositories/user.repository');
const { publicUser } = require('../utils/user');
const { validateRequired } = require('../utils/validators');
const httpError = require('../utils/httpError');

class UserService {
  async getAll() {
    const users = await userRepository.findAll();
    return users.map(publicUser);
  }

  async create(data) {
    const user = this.mapUserData(data);
    validateRequired({ name: user.name, username: user.username, password: user.password, role: user.role });
    this.validateRole(user.role);
    if (user.password.length < 6) throw httpError('La contrasena debe tener al menos 6 caracteres.', 400);
    if (await userRepository.existsByUsername(user.username)) throw httpError('El usuario ya existe.', 409);

    const created = await userRepository.create({
      ...user,
      passwordHash: await bcrypt.hash(user.password, 12)
    });
    return publicUser(created);
  }

  async update(id, data) {
    const current = await userRepository.findById(id);
    if (!current) throw httpError('Usuario no encontrado.', 404);

    const user = this.mapUserData(data);
    validateRequired({ name: user.name, username: user.username, role: user.role });
    this.validateRole(user.role);
    if (user.password && user.password.length < 6) throw httpError('La contrasena debe tener al menos 6 caracteres.', 400);
    if (await userRepository.existsByUsername(user.username, current.id)) throw httpError('El usuario ya existe.', 409);

    const updated = await userRepository.update(id, {
      ...user,
      passwordHash: user.password ? await bcrypt.hash(user.password, 12) : ''
    });
    return publicUser(updated);
  }

  async delete(id, currentUser) {
    const user = await userRepository.findById(id);
    if (!user) throw httpError('Usuario no encontrado.', 404);
    if (Number(user.id) === Number(currentUser.id)) throw httpError('No puedes desactivar tu propio usuario.', 409);

    await userRepository.deactivate(id);
    return { ok: true };
  }

  mapUserData(data) {
    return {
      name: String(data.name || '').trim(),
      username: String(data.username || '').trim(),
      password: String(data.password || ''),
      role: String(data.role || '').trim().toUpperCase(),
      active: data.active === undefined ? true : Boolean(data.active)
    };
  }

  validateRole(role) {
    if (!Object.values(ROLES).includes(role)) throw httpError('Rol no valido.', 400);
  }
}

module.exports = new UserService();
