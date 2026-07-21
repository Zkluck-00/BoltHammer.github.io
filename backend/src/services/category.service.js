const categoryRepository = require('../repositories/category.repository');
const { validateRequired } = require('../utils/validators');
const httpError = require('../utils/httpError');

class CategoryService {
  async getAll() {
    return categoryRepository.findAll();
  }

  async create(data) {
    const name = String(data.name || '').trim();
    const description = String(data.description || '').trim();

    validateRequired({ name });
    if (await categoryRepository.existsByName(name)) throw httpError('La categoria ya existe.', 409);

    return categoryRepository.create({ name, description });
  }

  async update(id, data) {
    const category = await categoryRepository.findById(id);
    if (!category || category.active === false) throw httpError('Categoria no encontrada.', 404);

    const name = String(data.name || '').trim();
    const description = String(data.description || '').trim();

    validateRequired({ name });
    if (await categoryRepository.existsByName(name, category.id)) throw httpError('La categoria ya existe.', 409);

    return categoryRepository.update(id, { name, description });
  }

  async delete(id) {
    if (await categoryRepository.hasProducts(id)) {
      throw httpError('No se puede eliminar una categoria asociada a productos.', 409);
    }
    await categoryRepository.removeById(id);
    return { ok: true };
  }
}

module.exports = new CategoryService();
