const STORAGE = {
  token: 'bolt.token',
  user: 'bolt.user'
};

let currentUser = null;
let pageState = {
  products: [], categories: [], suppliers: [], clients: [], cart: []
};

const qs = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
const todayText = () => new Date().toLocaleDateString('es-PE');
const isAdmin = () => currentUser?.role === 'ADMIN';

function getToken() { return localStorage.getItem(STORAGE.token); }
function getUserLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE.user)); }
  catch { return null; }
}
function saveSession(token, user) {
  localStorage.setItem(STORAGE.token, token);
  localStorage.setItem(STORAGE.user, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(STORAGE.token);
  localStorage.removeItem(STORAGE.user);
}
function logout() {
  clearSession();
  window.location.href = '../index.html';
}

function notify(id, message, type = 'danger') {
  const box = qs(id);
  if (!box) return;
  box.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  </div>`;
}

async function api(path, options = {}) {
  return ApiClient.request(path, options);
}

async function initLogin() {
  const form = qs('loginForm');
  if (!form) return;
  if (getToken()) {
    window.location.href = 'pages/dashboard.html';
    return;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const username = qs('username').value.trim();
      const password = qs('password').value;
      const data = await api('/auth/login', { method: 'POST', body: { username, password } });
      saveSession(data.token, data.user);
      window.location.href = 'pages/dashboard.html';
    } catch (err) {
      notify('loginAlert', err.message, 'danger');
    }
  });
}

async function requireAuth() {
  if (!getToken()) {
    window.location.href = '../index.html';
    return false;
  }
  currentUser = getUserLocal();
  try {
    const data = await api('/auth/me');
    currentUser = data.user;
    localStorage.setItem(STORAGE.user, JSON.stringify(currentUser));
    return true;
  } catch {
    return false;
  }
}

function menuItems() {
  return [
    { section: 'General' },
    { page: 'dashboard', icon: 'bi-speedometer2', label: 'Dashboard', href: 'dashboard.html', roles: ['ADMIN', 'VENDEDOR', 'ALMACENERO'] },
    { page: 'productos', icon: 'bi-box-seam', label: 'Productos', href: 'productos.html', roles: ['ADMIN', 'VENDEDOR', 'ALMACENERO'] },
    { page: 'ventas', icon: 'bi-cart-check', label: 'Ventas', href: 'ventas.html', roles: ['ADMIN', 'VENDEDOR'] },
    { page: 'clientes', icon: 'bi-people', label: 'Clientes', href: 'clientes.html', roles: ['ADMIN', 'VENDEDOR'] },
    { section: 'Administracion' },
    { page: 'categorias', icon: 'bi-tags', label: 'Categorias', href: 'categorias.html', roles: ['ADMIN'] },
    { page: 'proveedores', icon: 'bi-truck', label: 'Proveedores', href: 'proveedores.html', roles: ['ADMIN'] },
    { page: 'movimientos', icon: 'bi-arrow-left-right', label: 'Movimientos', href: 'movimientos.html', roles: ['ADMIN', 'ALMACENERO'] },
    { page: 'reportes', icon: 'bi-bar-chart', label: 'Reportes', href: 'reportes.html', roles: ['ADMIN'] },
    { page: 'usuarios', icon: 'bi-person-gear', label: 'Usuarios', href: 'usuarios.html', roles: ['ADMIN'] }
  ];
}

function buildLayout(pageName) {
  const sidebar = qs('sidebar');
  const topbar = qs('topbar');
  if (sidebar) {
    const html = menuItems().map(item => {
      if (item.section) return `<div class="menu-section">${item.section}</div>`;
      if (!item.roles.includes(currentUser.role)) return '';
      const active = item.page === pageName ? 'active' : '';
      return `<a class="menu-link ${active}" href="${item.href}"><i class="bi ${item.icon}"></i><span>${item.label}</span></a>`;
    }).join('');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `<div class="brand-box">
      <div class="brand-title fs-5">🔩 Bolt & Hammer</div>
      <div class="brand-subtitle">Sistema de inventario</div>
    </div>${html}
    <button class="btn btn-outline-light w-100 mt-3" onclick="logout()"><i class="bi bi-box-arrow-right me-1"></i> Cerrar sesion</button>`;
  }
  if (topbar) {
    const roleClass = currentUser.role === 'ADMIN' ? 'badge-role-admin' : 'badge-role-vendedor';
    const roleNames = { ADMIN: 'Administrador', VENDEDOR: 'Vendedor', ALMACENERO: 'Almacenero' };
    const roleName = roleNames[currentUser.role] || currentUser.role;
    topbar.className = 'topbar';
    topbar.innerHTML = `<div>
      <div class="fw-bold">${document.title.replace(' | Bolt & Hammer', '')}</div>
      <div class="small-muted">Fecha: ${todayText()}</div>
    </div>
    <div class="d-flex align-items-center gap-2">
      <span class="badge ${roleClass}">${roleName}</span>
      <span class="fw-semibold">${currentUser.name}</span>
    </div>`;
  }
}

function guardAdminPage(pageName) {
  const allowedRoles = {
    categorias: ['ADMIN'],
    proveedores: ['ADMIN'],
    movimientos: ['ADMIN', 'ALMACENERO'],
    reportes: ['ADMIN'],
    usuarios: ['ADMIN']
  };
  const roles = allowedRoles[pageName];
  if (roles && !roles.includes(currentUser?.role)) {
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}

function fillSelect(id, rows, label, placeholder = 'Selecciona una opcion') {
  const select = qs(id);
  if (!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>` + rows.map(r => `<option value="${r.id}">${label(r)}</option>`).join('');
}

function tableEmpty(colspan, text) { return `<tr><td colspan="${colspan}" class="empty-state">${text}</td></tr>`; }

async function initDashboard() {
  const data = await api('/dashboard');
  qs('metricToday').textContent = money(data.metrics.totalToday);
  qs('metricStock').textContent = data.metrics.totalStock;
  qs('metricLow').textContent = data.metrics.lowStockCount;
  qs('metricClients').textContent = data.metrics.clientsCount;
  qs('metricSales').textContent = data.metrics.salesCount;

  const lowBody = qs('lowStockBody');
  lowBody.innerHTML = data.lowStock.length ? data.lowStock.map(p => `<tr>
    <td>${p.code}</td><td>${p.name}</td><td>${p.categoryName}</td>
    <td><span class="badge text-bg-danger">${p.stock}</span></td><td>${p.minStock}</td>
  </tr>`).join('') : tableEmpty(5, 'No hay productos con stock bajo.');

  const recentBody = qs('recentSalesBody');
  recentBody.innerHTML = data.recentSales.length ? data.recentSales.map(s => `<tr>
    <td>${s.date}</td><td>${s.clientName}</td><td>${s.sellerName}</td><td>${s.payment}</td><td>${money(s.total)}</td>
  </tr>`).join('') : tableEmpty(5, 'No hay ventas registradas.');
}

async function loadCatalogs() {
  const [categories, suppliers, products, clients] = await Promise.all([
    api('/categories'), api('/suppliers'), api('/products'), api('/clients')
  ]);
  pageState.categories = categories;
  pageState.suppliers = suppliers;
  pageState.products = products;
  pageState.clients = clients;
}

async function initProducts() {
  await loadCatalogs();
  fillSelect('categoryId', pageState.categories, c => c.name);
  fillSelect('supplierId', pageState.suppliers, s => s.company, 'Sin proveedor');
  renderProducts();
  const form = qs('productForm');
  const adminPanel = qs('adminProductPanel');
  if (!isAdmin()) {
    adminPanel?.classList.add('d-none');
    qs('productRoleNotice')?.classList.remove('d-none');
  }
  qs('searchProduct')?.addEventListener('input', renderProducts);
  qs('btnCancelProduct')?.addEventListener('click', resetProductForm);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    const payload = {
      code: qs('code').value.trim(), name: qs('name').value.trim(), categoryId: Number(qs('categoryId').value),
      supplierId: Number(qs('supplierId').value || 0) || null, stock: Number(qs('stock').value), minStock: Number(qs('minStock').value),
      buyPrice: Number(qs('buyPrice').value), salePrice: Number(qs('salePrice').value)
    };
    try {
      const id = qs('productId').value;
      if (id) await api(`/products/${id}`, { method: 'PUT', body: payload });
      else await api('/products', { method: 'POST', body: payload });
      notify('productAlert', id ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.', 'success');
      resetProductForm();
      await loadCatalogs();
      renderProducts();
    } catch (err) { notify('productAlert', err.message, 'danger'); }
  });
}

function renderProducts() {
  const term = (qs('searchProduct')?.value || '').toLowerCase();
  const rows = pageState.products.filter(p => [p.code, p.name, p.categoryName, p.supplierName].join(' ').toLowerCase().includes(term));
  const body = qs('productTableBody');
  body.innerHTML = rows.length ? rows.map(p => `<tr>
    <td>${p.code}</td><td>${p.name}</td><td>${p.categoryName}</td><td>${p.supplierName || '-'}</td>
    <td><span class="badge ${Number(p.stock) <= Number(p.minStock) ? 'text-bg-danger' : 'text-bg-success'}">${p.stock}</span></td>
    <td>${money(p.salePrice)}</td>
    <td class="text-end">${isAdmin() ? `<button class="btn btn-sm btn-outline-primary" onclick="editProduct(${p.id})">Editar</button> <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})">Eliminar</button>` : '<span class="text-muted">Consulta</span>'}</td>
  </tr>`).join('') : tableEmpty(7, 'No hay productos registrados.');
}

function resetProductForm() {
  qs('productId').value = '';
  qs('productForm')?.reset();
  qs('productFormTitle').textContent = 'Registrar producto';
}
function editProduct(id) {
  const p = pageState.products.find(x => x.id === id);
  if (!p) return;
  qs('productId').value = p.id; qs('code').value = p.code; qs('name').value = p.name; qs('categoryId').value = p.categoryId;
  qs('supplierId').value = p.supplierId || ''; qs('stock').value = p.stock; qs('minStock').value = p.minStock;
  qs('buyPrice').value = p.buyPrice; qs('salePrice').value = p.salePrice; qs('productFormTitle').textContent = 'Editar producto';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function deleteProduct(id) {
  if (!confirm('Seguro que deseas eliminar este producto?')) return;
  try { await api(`/products/${id}`, { method: 'DELETE' }); await loadCatalogs(); renderProducts(); notify('productAlert', 'Producto eliminado correctamente.', 'success'); }
  catch (err) { notify('productAlert', err.message, 'danger'); }
}

function initCrudPage({ endpoint, stateKey, formId, idField, alertId, tableBodyId, searchId, fields, renderRow, resetTitleId, createTitle, editTitle, adminOnly = true }) {
  let rows = [];
  const load = async () => { rows = await api(endpoint); render(); };
  const form = qs(formId);
  const resetForm = () => { qs(idField).value = ''; form?.reset(); if (resetTitleId) qs(resetTitleId).textContent = createTitle; };
  const render = () => {
    const term = (qs(searchId)?.value || '').toLowerCase();
    const filtered = rows.filter(r => Object.values(r).join(' ').toLowerCase().includes(term));
    qs(tableBodyId).innerHTML = filtered.length ? filtered.map(renderRow).join('') : tableEmpty(6, 'No hay registros.');
  };
  qs(searchId)?.addEventListener('input', render);
  qs(`btnCancel${stateKey}`)?.addEventListener('click', resetForm);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (adminOnly && !isAdmin()) return;
    const payload = {};
    fields.forEach(f => payload[f.key] = f.type === 'number' ? Number(qs(f.id).value) : qs(f.id).value.trim());
    try {
      const id = qs(idField).value;
      if (id) await api(`${endpoint}/${id}`, { method: 'PUT', body: payload });
      else await api(endpoint, { method: 'POST', body: payload });
      notify(alertId, id ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.', 'success');
      resetForm(); await load();
    } catch (err) { notify(alertId, err.message, 'danger'); }
  });
  window[`edit${stateKey}`] = (id) => {
    const row = rows.find(r => Number(r.id) === Number(id));
    if (!row) return;
    qs(idField).value = row.id;
    fields.forEach(f => { qs(f.id).value = row[f.key] ?? ''; });
    if (resetTitleId) qs(resetTitleId).textContent = editTitle;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  window[`delete${stateKey}`] = async (id) => {
    if (!confirm('Seguro que deseas eliminar este registro?')) return;
    try { await api(`${endpoint}/${id}`, { method: 'DELETE' }); await load(); notify(alertId, 'Registro eliminado correctamente.', 'success'); }
    catch (err) { notify(alertId, err.message, 'danger'); }
  };
  return load();
}

function initCategories() {
  return initCrudPage({
    endpoint: '/categories', stateKey: 'Category', formId: 'categoryForm', idField: 'categoryId', alertId: 'categoryAlert',
    tableBodyId: 'categoryTableBody', searchId: 'searchCategory', resetTitleId: 'categoryFormTitle', createTitle: 'Registrar categoria', editTitle: 'Editar categoria',
    fields: [{ id: 'name', key: 'name' }, { id: 'description', key: 'description' }],
    renderRow: c => `<tr><td>${c.name}</td><td>${c.description || '-'}</td><td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="editCategory(${c.id})">Editar</button> <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${c.id})">Eliminar</button></td></tr>`
  });
}

function initSuppliers() {
  return initCrudPage({
    endpoint: '/suppliers', stateKey: 'Supplier', formId: 'supplierForm', idField: 'supplierId', alertId: 'supplierAlert',
    tableBodyId: 'supplierTableBody', searchId: 'searchSupplier', resetTitleId: 'supplierFormTitle', createTitle: 'Registrar proveedor', editTitle: 'Editar proveedor',
    fields: [{ id: 'company', key: 'company' }, { id: 'ruc', key: 'ruc' }, { id: 'phone', key: 'phone' }, { id: 'email', key: 'email' }, { id: 'address', key: 'address' }],
    renderRow: s => `<tr><td>${s.company}</td><td>${s.ruc}</td><td>${s.phone || '-'}</td><td>${s.email || '-'}</td><td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="editSupplier(${s.id})">Editar</button> <button class="btn btn-sm btn-outline-danger" onclick="deleteSupplier(${s.id})">Eliminar</button></td></tr>`
  });
}

function initClients() {
  let rows = [];
  const load = async () => { rows = await api('/clients'); render(); };
  const form = qs('clientForm');
  const resetForm = () => { qs('clientId').value = ''; form?.reset(); qs('clientFormTitle').textContent = 'Registrar cliente'; };
  const render = () => {
    const term = (qs('searchClient')?.value || '').toLowerCase();
    const filtered = rows.filter(r => Object.values(r).join(' ').toLowerCase().includes(term));
    qs('clientTableBody').innerHTML = filtered.length ? filtered.map(c => `<tr>
      <td>${c.name}</td><td>${c.document}</td><td>${c.phone || '-'}</td><td>${c.email || '-'}</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="editClient(${c.id})">Editar</button> ${isAdmin() ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteClient(${c.id})">Eliminar</button>` : ''}</td>
    </tr>`).join('') : tableEmpty(5, 'No hay clientes registrados.');
  };
  qs('searchClient')?.addEventListener('input', render);
  qs('btnCancelClient')?.addEventListener('click', resetForm);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = { name: qs('name').value.trim(), document: qs('document').value.trim(), phone: qs('phone').value.trim(), email: qs('email').value.trim(), address: qs('address').value.trim() };
    try {
      const id = qs('clientId').value;
      if (id) await api(`/clients/${id}`, { method: 'PUT', body: payload });
      else await api('/clients', { method: 'POST', body: payload });
      notify('clientAlert', id ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.', 'success');
      resetForm(); await load();
    } catch (err) { notify('clientAlert', err.message, 'danger'); }
  });
  window.editClient = (id) => { const c = rows.find(x => x.id === id); if (!c) return; qs('clientId').value = c.id; qs('name').value = c.name; qs('document').value = c.document; qs('phone').value = c.phone || ''; qs('email').value = c.email || ''; qs('address').value = c.address || ''; qs('clientFormTitle').textContent = 'Editar cliente'; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  window.deleteClient = async (id) => { if (!confirm('Seguro que deseas eliminar este cliente?')) return; try { await api(`/clients/${id}`, { method: 'DELETE' }); await load(); notify('clientAlert', 'Cliente eliminado correctamente.', 'success'); } catch (err) { notify('clientAlert', err.message, 'danger'); } };
  return load();
}

async function initSales() {
  await loadCatalogs();
  fillSelect('saleClient', pageState.clients, c => `${c.name} - ${c.document}`, 'Cliente general');
  fillSelect('saleProduct', pageState.products, p => `${p.code} | ${p.name} | Stock: ${p.stock} | ${money(p.salePrice)}`);
  pageState.cart = [];
  renderCart();
  renderSales(await api('/sales'));

  qs('btnAddToCart')?.addEventListener('click', () => {
    const product = pageState.products.find(p => Number(p.id) === Number(qs('saleProduct').value));
    const qty = Number(qs('saleQty').value);
    if (!product) return notify('saleAlert', 'Selecciona un producto.', 'warning');
    if (!Number.isFinite(qty) || qty < 1) return notify('saleAlert', 'La cantidad debe ser mayor a cero.', 'warning');
    const existing = pageState.cart.find(i => i.productId === product.id);
    const newQty = (existing?.qty || 0) + qty;
    if (newQty > Number(product.stock)) return notify('saleAlert', 'La cantidad supera el stock disponible.', 'danger');
    if (existing) existing.qty = newQty;
    else pageState.cart.push({ productId: product.id, code: product.code, name: product.name, qty, price: Number(product.salePrice) });
    qs('saleQty').value = 1;
    renderCart();
  });

  qs('btnCompleteSale')?.addEventListener('click', async () => {
    try {
      const selectedClientId = qs('saleClient').value;
      const payload = { clientId: selectedClientId ? Number(selectedClientId) : null, payment: qs('salePayment').value, items: pageState.cart.map(i => ({ productId: i.productId, qty: i.qty })) };
      await api('/sales', { method: 'POST', body: payload });
      notify('saleAlert', 'Venta registrada correctamente. El stock fue actualizado.', 'success');
      await loadCatalogs();
      fillSelect('saleProduct', pageState.products, p => `${p.code} | ${p.name} | Stock: ${p.stock} | ${money(p.salePrice)}`);
      pageState.cart = [];
      renderCart();
      renderSales(await api('/sales'));
    } catch (err) { notify('saleAlert', err.message, 'danger'); }
  });
}
function renderCart() {
  const body = qs('cartBody');
  body.innerHTML = pageState.cart.length ? pageState.cart.map((i, idx) => `<tr>
    <td>${i.code}</td><td>${i.name}</td><td>${i.qty}</td><td>${money(i.price)}</td><td>${money(i.qty * i.price)}</td>
    <td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="removeCartItem(${idx})">Quitar</button></td>
  </tr>`).join('') : tableEmpty(6, 'Agrega productos a la venta.');
  const total = pageState.cart.reduce((sum, i) => sum + (i.qty * i.price), 0);
  qs('saleTotal').textContent = money(total);
}
function removeCartItem(idx) { pageState.cart.splice(idx, 1); renderCart(); }
function renderSales(sales) {
  qs('salesTableBody').innerHTML = sales.length ? sales.map(s => `<tr>
    <td>${s.date}</td><td>${s.clientName}</td><td>${s.sellerName}</td><td>${s.payment}</td><td>${(s.items || []).length}</td><td>${money(s.total)}</td>
  </tr>`).join('') : tableEmpty(6, 'No hay ventas registradas.');
}

async function initMovements() {
  const [products, movements] = await Promise.all([api('/products'), api('/movements')]);
  pageState.products = products;
  fillSelect('movementProduct', products, p => `${p.code} | ${p.name} | Stock actual: ${p.stock}`);
  renderMovements(movements);
  qs('movementForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = { productId: Number(qs('movementProduct').value), type: qs('movementType').value, quantity: Number(qs('movementQuantity').value), reason: qs('movementReason').value.trim() };
    try { await api('/movements', { method: 'POST', body: payload }); notify('movementAlert', 'Movimiento registrado correctamente.', 'success'); qs('movementForm').reset(); const [p2, m2] = await Promise.all([api('/products'), api('/movements')]); pageState.products = p2; fillSelect('movementProduct', p2, p => `${p.code} | ${p.name} | Stock actual: ${p.stock}`); renderMovements(m2); }
    catch (err) { notify('movementAlert', err.message, 'danger'); }
  });
}
function renderMovements(rows) {
  qs('movementTableBody').innerHTML = rows.length ? rows.map(m => `<tr><td>${m.date}</td><td><span class="badge ${m.type === 'SALIDA' ? 'text-bg-danger' : 'text-bg-success'}">${m.type}</span></td><td>${m.productName}</td><td>${m.quantity}</td><td>${m.reason}</td><td>${m.userName}</td></tr>`).join('') : tableEmpty(6, 'No hay movimientos registrados.');
}

async function initReports() {
  const data = await api('/reports');
  qs('reportIncome').textContent = money(data.metrics.totalIncome);
  qs('reportCost').textContent = money(data.metrics.totalCost);
  qs('reportProfit').textContent = money(data.metrics.estimatedProfit);
  qs('reportStockValue').textContent = money(data.metrics.stockValue);
  qs('reportSalesCount').textContent = data.metrics.salesCount;
  qs('reportProductCount').textContent = data.metrics.productCount;
  qs('reportTopBody').innerHTML = data.topProducts.length ? data.topProducts.map(p => `<tr><td>${p.name}</td><td>${p.qty}</td></tr>`).join('') : tableEmpty(2, 'Sin ventas por producto.');
  qs('reportLowBody').innerHTML = data.lowStock.length ? data.lowStock.map(p => `<tr><td>${p.code}</td><td>${p.name}</td><td>${p.categoryName}</td><td>${p.stock}</td><td>${p.minStock}</td></tr>`).join('') : tableEmpty(5, 'Sin productos con stock bajo.');
  qs('reportSalesBody').innerHTML = data.recentSales.length ? data.recentSales.map(s => `<tr><td>${s.date}</td><td>${s.clientName}</td><td>${s.sellerName}</td><td>${s.payment}</td><td>${money(s.total)}</td></tr>`).join('') : tableEmpty(5, 'Sin ventas registradas.');
}

async function initUsers() {
  let users = [];
  const load = async () => { users = await api('/users'); render(); };
  const form = qs('userForm');
  const reset = () => { qs('userId').value = ''; form?.reset(); qs('userActive').checked = true; qs('userFormTitle').textContent = 'Registrar usuario'; };
  const render = () => {
    qs('userTableBody').innerHTML = users.length ? users.map(u => `<tr>
      <td>${u.name}</td><td>${u.username}</td><td><span class="badge ${u.role === 'ADMIN' ? 'text-bg-danger' : 'text-bg-primary'}">${u.role}</span></td><td>${u.active ? 'Activo' : 'Inactivo'}</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="editUser(${u.id})">Editar</button> <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">Desactivar</button></td>
    </tr>`).join('') : tableEmpty(5, 'No hay usuarios registrados.');
  };
  qs('btnCancelUser')?.addEventListener('click', reset);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = qs('userId').value;
    const payload = { name: qs('userName').value.trim(), username: qs('userUsername').value.trim(), password: qs('userPassword').value.trim(), role: qs('userRole').value, active: qs('userActive').checked };
    try { if (id) await api(`/users/${id}`, { method: 'PUT', body: payload }); else await api('/users', { method: 'POST', body: payload }); notify('userAlert', id ? 'Usuario actualizado correctamente.' : 'Usuario registrado correctamente.', 'success'); reset(); await load(); }
    catch (err) { notify('userAlert', err.message, 'danger'); }
  });
  window.editUser = (id) => { const u = users.find(x => x.id === id); if (!u) return; qs('userId').value = u.id; qs('userName').value = u.name; qs('userUsername').value = u.username; qs('userPassword').value = ''; qs('userRole').value = u.role; qs('userActive').checked = Boolean(u.active); qs('userFormTitle').textContent = 'Editar usuario'; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  window.deleteUser = async (id) => { if (!confirm('Seguro que deseas desactivar este usuario?')) return; try { await api(`/users/${id}`, { method: 'DELETE' }); notify('userAlert', 'Usuario desactivado correctamente.', 'success'); await load(); } catch (err) { notify('userAlert', err.message, 'danger'); } };
  await load();
}

async function boot() {
  if (document.body.dataset.page === 'login') { initLogin(); return; }
  const ok = await requireAuth();
  if (!ok) return;
  const pageName = document.body.dataset.page;
  if (!guardAdminPage(pageName)) return;
  buildLayout(pageName);
  try {
    if (pageName === 'dashboard') await initDashboard();
    if (pageName === 'productos') await initProducts();
    if (pageName === 'categorias') await initCategories();
    if (pageName === 'proveedores') await initSuppliers();
    if (pageName === 'clientes') await initClients();
    if (pageName === 'ventas') await initSales();
    if (pageName === 'movimientos') await initMovements();
    if (pageName === 'reportes') await initReports();
    if (pageName === 'usuarios') await initUsers();
  } catch (err) {
    const container = qs('pageAlert');
    if (container) notify('pageAlert', err.message, 'danger');
    else alert(err.message);
  }
}

document.addEventListener('DOMContentLoaded', boot);
