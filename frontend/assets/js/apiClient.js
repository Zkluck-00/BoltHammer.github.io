// Facade Pattern: centraliza y simplifica todas las peticiones HTTP del frontend.
const ApiClient = {
  storage: {
    token: 'bolt.token',
    user: 'bolt.user'
  },

  getToken() {
    return localStorage.getItem(this.storage.token);
  },

  clearSession() {
    localStorage.removeItem(this.storage.token);
    localStorage.removeItem(this.storage.user);
  },

  async request(path, options = {}) {
    const headers = options.headers || {};
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const token = this.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (options.body && typeof options.body !== 'string') config.body = JSON.stringify(options.body);

    let response;
    try {
      response = await fetch(`${API_URL}${path}`, config);
    } catch {
      throw new Error('No se pudo contactar al backend. Verifica que npm start siga ejecutandose en el puerto 3000.');
    }

    let data = null;
    try { data = await response.json(); } catch { data = null; }

    if (!response.ok) {
      const msg = data?.error || 'No se pudo completar la solicitud.';
      if (response.status === 401) {
        this.clearSession();
        alert('La sesion expiro o no es valida. Inicia sesion nuevamente.');
        window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
      }
      throw new Error(msg);
    }

    return data;
  },

  get(path) {
    return this.request(path, { method: 'GET' });
  },

  post(path, body) {
    return this.request(path, { method: 'POST', body });
  },

  put(path, body) {
    return this.request(path, { method: 'PUT', body });
  },

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
};
