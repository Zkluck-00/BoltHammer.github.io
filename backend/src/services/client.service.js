const clientRepository = require('../repositories/client.repository');
const { validateRequired } = require('../utils/validators');
const httpError = require('../utils/httpError');

class ClientService {
  async getAll() {
    return clientRepository.findAll();
  }

  async create(data) {
    const client = this.mapClient(data);
    validateRequired({ name: client.name, document: client.document });
    if (await clientRepository.existsByDocument(client.document)) throw httpError('Ya existe un cliente con ese documento.', 409);
    return clientRepository.create(client);
  }

  async update(id, data) {
    const current = await clientRepository.findById(id);
    if (!current || current.active === false) throw httpError('Cliente no encontrado.', 404);

    const client = this.mapClient(data);
    validateRequired({ name: client.name, document: client.document });
    if (await clientRepository.existsByDocument(client.document, current.id)) throw httpError('Ya existe un cliente con ese documento.', 409);
    return clientRepository.update(id, client);
  }

  async delete(id) {
    const client = await clientRepository.findById(id);
    if (!client) throw httpError('Cliente no encontrado.', 404);
    if (client.document === '00000000') throw httpError('El cliente general no se puede eliminar.', 409);
    await clientRepository.removeById(id);
    return { ok: true };
  }

  mapClient(data) {
    return {
      name: String(data.name || '').trim(),
      document: String(data.document || '').trim(),
      phone: String(data.phone || '').trim(),
      email: String(data.email || '').trim(),
      address: String(data.address || '').trim()
    };
  }
}

module.exports = new ClientService();
