import Chart from 'chart.js/auto';

const API_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));

// ==========================================
// 1. NAVEGACIÓN Y RUTEO
// ==========================================
function showSection(sectionId) {
  const sections = [
    'login-section', 'public-register-section', 'waiting-section',
    'admin-section', 'vendedor-section', 'distribuidor-section', 'user-section'
  ];
  
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex'); 
    }
  });

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('flex');
  }
}

function init() {
  if (authToken && currentUser) {
    routeUser(currentUser.role, currentUser.status);
  } else {
    showSection('login-section');
  }
}

function routeUser(role, status) {
  if (role === 'vendedor' && status === 'pendiente') {
    showSection('waiting-section');
    return;
  }

  switch (role) {
    case 'admin':
      showSection('admin-section');
      cargarProductosAdmin(); 
      cargarUsuariosAdmin();
      loadAdminAnalytics();
      break;
    case 'vendedor':
      showSection('vendedor-section');
      loadProducts(); 
      break;
    case 'distribuidor':
      showSection('distribuidor-section');
      loadOrders();
      loadDistribuidorProducts(); 
      break;
    case 'user':
      showSection('user-section');
      document.getElementById('user-checkout-email').value = currentUser.email;
      loadUserProducts();
      renderUserCart();
      break;
    default:
      showSection('login-section');
  }
}

// ==========================================
// 2. LOGIN, LOGOUT Y REGISTRO
// ==========================================
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('login-error');

  errorMsg.classList.add('hidden');
  errorMsg.textContent = '';

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw new Error("Respuesta inválida del servidor");
    }

    if (!res.ok) {
      errorMsg.textContent = data.error === 'CUENTA_PENDIENTE'
        ? 'Tu solicitud de colaborador sigue pendiente de aprobación.'
        : data.error || data.message || 'Correo o contraseña incorrectos.';
      errorMsg.classList.remove('hidden');
      return;
    }

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    routeUser(currentUser.role, currentUser.status);
    
  } catch (error) {
    console.error('Error de red:', error);
    errorMsg.textContent = 'Error de conexión. Verifica que el servidor backend esté encendido.';
    errorMsg.classList.remove('hidden');
  }
});

document.querySelectorAll('.logout-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    window.location.reload();
  });
});

document.getElementById('public-register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const isCollaborator = document.getElementById('reg-collaborator').checked;

  try {
    const res = await fetch(`${API_URL}/users`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, isCollaborator })
    });
    
    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw new Error("Respuesta inválida del servidor");
    }

    if (res.ok) {
      alert(data.message || (isCollaborator
        ? 'Solicitud enviada. Espera la aprobación de un administrador.'
        : 'Cuenta creada. Ya puedes iniciar sesión.'));
      showSection('login-section');
      document.getElementById('public-register-form').reset();
    } else {
      alert('Error: ' + (data.error || 'No se pudo registrar'));
    }
  } catch (error) {
    console.error('Error en registro:', error);
    alert('Error de conexión.');
  }
});

let marketProducts = [];
let userCart = [];

function formatMoney(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

async function loadUserProducts() {
  const grid = document.getElementById('user-products-grid');
  const message = document.getElementById('user-products-message');
  grid.replaceChildren();
  message.textContent = 'Cargando productos disponibles...';
  message.classList.remove('hidden');

  try {
    const response = await fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const products = await response.json();
    if (!response.ok) throw new Error(products.error || 'No se pudo cargar el catálogo.');

    marketProducts = products.filter(product => product.status === 'aprobado' && Number(product.stock) > 0);
    if (marketProducts.length === 0) {
      message.textContent = 'No hay productos disponibles por ahora.';
      return;
    }

    message.classList.add('hidden');
    marketProducts.forEach(product => grid.appendChild(createMarketTile(product)));
  } catch (error) {
    message.textContent = error.message || 'Error de conexión al cargar el catálogo.';
  }
}

function createMarketTile(product) {
  const tile = document.createElement('article');
  tile.className = 'overflow-hidden border border-gray-200 bg-white';

  const imageFrame = document.createElement('div');
  imageFrame.className = 'relative aspect-[4/3] bg-gray-100';
  const placeholder = createTextElement('span', 'absolute inset-0 grid place-items-center text-sm text-gray-400', 'Sin imagen');
  imageFrame.appendChild(placeholder);
  if (product.imageUrl) {
    const image = document.createElement('img');
    image.src = product.imageUrl.startsWith('http') ? product.imageUrl : `http://localhost:3000${product.imageUrl}`;
    image.alt = product.name;
    image.loading = 'lazy';
    image.className = 'relative h-full w-full object-cover';
    image.addEventListener('error', () => image.remove(), { once: true });
    imageFrame.appendChild(image);
  }

  const content = document.createElement('div');
  content.className = 'p-4';
  content.appendChild(createTextElement('p', 'text-xs uppercase text-gray-500', `Vendido por ${product.vendedorName || 'Vendedor'}`));
  content.appendChild(createTextElement('h3', 'mt-1 min-h-12 text-base font-bold text-gray-900', product.name));
  content.appendChild(createTextElement('p', 'mt-2 text-xl font-black text-gray-900', formatMoney(product.price)));
  content.appendChild(createTextElement('p', 'mt-1 text-sm text-gray-600', `${product.stock} unidades disponibles`));

  const controls = document.createElement('div');
  controls.className = 'mt-4 flex items-end gap-2';
  const quantityLabel = document.createElement('label');
  quantityLabel.className = 'flex-1 text-xs font-bold uppercase text-gray-500';
  quantityLabel.textContent = 'Cantidad';
  const quantityInput = document.createElement('input');
  quantityInput.type = 'number';
  quantityInput.min = '1';
  quantityInput.max = String(product.stock);
  quantityInput.step = '1';
  quantityInput.value = '1';
  quantityInput.className = 'mt-1 block w-full border border-gray-300 px-3 py-2 text-sm text-gray-900';
  quantityInput.setAttribute('aria-label', `Cantidad de ${product.name}`);
  quantityLabel.appendChild(quantityInput);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'bg-black px-3 py-2 text-sm font-bold uppercase text-orange-500 hover:bg-orange-500 hover:text-black';
  addButton.textContent = 'Agregar';
  addButton.addEventListener('click', () => addUserCartItem(product, Number(quantityInput.value)));
  controls.append(quantityLabel, addButton);
  content.appendChild(controls);
  tile.append(imageFrame, content);
  return tile;
}

function addUserCartItem(product, quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    alert('Ingresa una cantidad válida.');
    return;
  }

  const existingItem = userCart.find(item => item.productId === product.id);
  const nextQuantity = (existingItem?.quantity || 0) + quantity;
  if (nextQuantity > Number(product.stock)) {
    alert(`Solo hay ${product.stock} unidades disponibles.`);
    return;
  }

  if (existingItem) {
    existingItem.quantity = nextQuantity;
  } else {
    userCart.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      stock: Number(product.stock),
      vendedorName: product.vendedorName || 'Vendedor',
      quantity
    });
  }
  renderUserCart();
}

function createUserCartLine(item, showControls) {
  const row = document.createElement('li');
  row.className = 'flex justify-between gap-3 py-3';
  const description = document.createElement('div');
  description.className = 'min-w-0';
  description.appendChild(createTextElement('p', 'font-bold text-gray-900', item.name));
  description.appendChild(createTextElement('p', 'text-xs text-gray-500', `Vendedor: ${item.vendedorName}`));
  description.appendChild(createTextElement('p', 'mt-1 text-sm text-gray-700', `${item.quantity} x ${formatMoney(item.price)}`));

  const actions = document.createElement('div');
  actions.className = 'flex shrink-0 flex-col items-end justify-between gap-2';
  actions.appendChild(createTextElement('span', 'font-bold text-gray-900', formatMoney(item.price * item.quantity)));
  if (showControls) {
    const controls = document.createElement('div');
    controls.className = 'flex items-center gap-1';
    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.className = 'h-8 w-8 border border-gray-300 font-bold';
    decrease.textContent = '-';
    decrease.setAttribute('aria-label', `Quitar una unidad de ${item.name}`);
    decrease.addEventListener('click', () => changeUserCartQuantity(item.productId, -1));
    const increase = document.createElement('button');
    increase.type = 'button';
    increase.className = 'h-8 w-8 border border-gray-300 font-bold';
    increase.textContent = '+';
    increase.setAttribute('aria-label', `Agregar una unidad de ${item.name}`);
    increase.disabled = item.quantity >= item.stock;
    increase.addEventListener('click', () => changeUserCartQuantity(item.productId, 1));
    controls.append(decrease, increase);
    actions.appendChild(controls);
  }
  row.append(description, actions);
  return row;
}

function changeUserCartQuantity(productId, amount) {
  const item = userCart.find(cartItem => cartItem.productId === productId);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) userCart = userCart.filter(cartItem => cartItem.productId !== productId);
  renderUserCart();
}

function renderUserCart() {
  const preview = document.getElementById('user-cart-preview');
  const details = document.getElementById('user-cart-details');
  const total = userCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = userCart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('user-cart-count').textContent = count;
  document.getElementById('user-cart-total').textContent = formatMoney(total);
  document.getElementById('user-cart-dialog-total').textContent = formatMoney(total);
  document.getElementById('user-cart-preview-empty').classList.toggle('hidden', userCart.length > 0);
  document.getElementById('user-cart-details-empty').classList.toggle('hidden', userCart.length > 0);
  document.getElementById('user-place-order').disabled = userCart.length === 0;
  document.getElementById('user-checkout-email').value = currentUser?.email || '';
  preview.replaceChildren(...userCart.map(item => createUserCartLine(item, false)));
  details.replaceChildren(...userCart.map(item => createUserCartLine(item, true)));
}

function openUserCart() {
  document.getElementById('user-checkout-message').classList.add('hidden');
  renderUserCart();
  document.getElementById('user-cart-dialog').showModal();
}

document.getElementById('user-cart-open').addEventListener('click', openUserCart);
document.getElementById('user-cart-review').addEventListener('click', openUserCart);
document.getElementById('user-cart-close').addEventListener('click', () => {
  document.getElementById('user-cart-dialog').close();
});
document.getElementById('refresh-user-products').addEventListener('click', loadUserProducts);

document.getElementById('user-place-order').addEventListener('click', async (event) => {
  if (userCart.length === 0) return;
  const button = event.currentTarget;
  const message = document.getElementById('user-checkout-message');
  button.disabled = true;
  button.textContent = 'Procesando pedido...';
  message.classList.add('hidden');

  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        items: userCart.map(item => ({ productId: item.productId, quantity: item.quantity }))
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo registrar el pedido.');

    userCart = [];
    renderUserCart();
    await loadUserProducts();
    message.textContent = result.emailSent
      ? result.previewUrl
        ? `Pedido #${result.orderId} confirmado. El recibo para ${currentUser.email} quedó listo como evidencia de demostración.`
        : `Pedido #${result.orderId} confirmado. Enviamos el detalle a ${currentUser.email}.`
      : `El pedido #${result.orderId} quedó registrado, pero no se pudo enviar el correo. Contacta a soporte antes de volver a comprar.`;
    message.className = result.emailSent ? 'mt-4 text-sm text-green-700' : 'mt-4 text-sm text-red-600';
    if (result.previewUrl) {
      const previewLink = document.createElement('a');
      previewLink.href = result.previewUrl;
      previewLink.target = '_blank';
      previewLink.rel = 'noopener noreferrer';
      previewLink.textContent = 'Abrir vista previa del correo';
      previewLink.className = 'mt-2 inline-block font-bold underline';
      message.append(document.createElement('br'), previewLink);
    }
  } catch (error) {
    message.textContent = error.message || 'Error de conexión al confirmar el pedido.';
    message.className = 'mt-4 text-sm text-red-600';
  } finally {
    button.textContent = 'Confirmar pedido y enviar recibo';
    button.disabled = userCart.length === 0;
  }
});

// ==========================================
// 3. PANEL VENDEDOR
// ==========================================
const productTableBody = document.getElementById('products-table-body');

window.loadProducts = async () => {
  if (!productTableBody) return;
  try {
    const response = await fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const products = await response.json();
    productTableBody.innerHTML = '';

    products.forEach(p => {
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-slate-50';
      const imgSrc = p.imageUrl ? `http://localhost:3000${p.imageUrl}` : 'https://via.placeholder.com/64?text=Sin+Foto';
      
      let statusClass = 'bg-yellow-200 text-yellow-800'; 
      if (p.status === 'aprobado') statusClass = 'bg-green-200 text-green-800';
      if (p.status === 'rechazado') statusClass = 'bg-red-200 text-red-800';

      tr.innerHTML = `
        <td class="p-3"><img src="${imgSrc}" class="w-16 h-16 object-cover rounded shadow-sm"></td>
        <td class="p-3 font-semibold text-gray-800">${p.name}</td>
        <td class="p-3 text-blue-600 font-bold">$${p.price}</td>
        <td class="p-3">${p.stock} uds.</td>
        <td class="p-3">
          <span class="px-2 py-1 text-xs rounded-full font-bold uppercase ${statusClass}">
            ${p.status || 'pendiente'}
          </span>
        </td>
        <td class="p-3 text-center">
          <button onclick="deleteProduct(${p.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm shadow uppercase font-bold">Eliminar</button>
        </td>
      `;
      productTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error cargando catálogo del vendedor:', error);
  }
};

document.getElementById('product-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('name', document.getElementById('prod-name').value);
  formData.append('price', document.getElementById('prod-price').value);
  formData.append('stock', document.getElementById('prod-stock').value);
  
  const imageFile = document.getElementById('prod-image').files[0];
  if (imageFile) formData.append('image', imageFile);

  try {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }, 
      body: formData
    });
    
    if (res.ok) {
      alert("¡Producto subido con éxito! Está pendiente de aprobación.");
      document.getElementById('product-form').reset();
      loadProducts(); 
    } else {
      const errorData = await res.json();
      alert("Error: " + (errorData.error || "No se pudo crear el producto"));
    }
  } catch (error) {
    console.error('Error al subir producto:', error);
  }
});

window.deleteProduct = async (id) => {
  if (!confirm('¿Eliminar este producto del catálogo?')) return;
  try {
    await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    loadProducts();
  } catch (error) {
    console.error('Error eliminando producto:', error);
  }
};

// ==========================================
// 4. PANEL ADMINISTRADOR
// ==========================================
// ==========================================
// 4. PANEL ADMINISTRADOR
// ==========================================
const analyticsCharts = { revenue: null, statuses: null };

function analyticsDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setAnalyticsDatePreset(preset) {
  const today = new Date();
  const from = new Date(today);
  if (preset === 'last7') from.setDate(today.getDate() - 6);
  if (preset === 'last30') from.setDate(today.getDate() - 29);
  if (preset === 'month') from.setDate(1);

  document.getElementById('analytics-from').value = analyticsDateInputValue(from);
  document.getElementById('analytics-to').value = analyticsDateInputValue(today);
}

function initializeAnalyticsFilters() {
  const preset = document.getElementById('analytics-range-preset');
  if (preset.dataset.initialized) return;
  setAnalyticsDatePreset(preset.value || 'last30');
  preset.dataset.initialized = 'true';
}

function formatAnalyticsMoney(amount) {
  return `$${Number(amount || 0).toLocaleString('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function addAnalyticsEmptyRow(body, columnCount, text) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = columnCount;
  cell.className = 'p-4 text-center text-sm text-gray-500';
  cell.textContent = text;
  row.appendChild(cell);
  body.appendChild(row);
}

function renderAnalyticsTable(body, rows, columns, emptyText) {
  body.replaceChildren();
  if (rows.length === 0) {
    addAnalyticsEmptyRow(body, columns.length, emptyText);
    return;
  }

  rows.forEach((values, rowIndex) => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    values.forEach((value, columnIndex) => {
      const cell = document.createElement('td');
      cell.className = `p-3 ${columnIndex === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`;
      cell.textContent = columnIndex === 0 && columns[columnIndex] === 'rank'
        ? String(rowIndex + 1)
        : String(value);
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
}

function renderAnalyticsDashboard(data) {
  document.getElementById('analytics-total-revenue').textContent = formatAnalyticsMoney(data.summary.totalRevenue);
  document.getElementById('analytics-order-count').textContent = data.summary.orderCount.toLocaleString('es-CL');
  document.getElementById('analytics-average-ticket').textContent = formatAnalyticsMoney(data.summary.averageTicket);
  document.getElementById('analytics-average-user').textContent = formatAnalyticsMoney(data.summary.averagePerUser);
  document.getElementById('analytics-customer-count').textContent = `${data.summary.customerCount.toLocaleString('es-CL')} compradores`;

  const revenueCanvas = document.getElementById('analytics-revenue-chart');
  analyticsCharts.revenue?.destroy();
  analyticsCharts.revenue = new Chart(revenueCanvas, {
    type: 'line',
    data: {
      labels: data.revenueTrend.map(item => item.period),
      datasets: [{
        label: 'Ingresos',
        data: data.revenueTrend.map(item => item.revenue),
        borderColor: '#e87518',
        backgroundColor: 'rgba(232, 117, 24, 0.14)',
        pointBackgroundColor: '#111827',
        pointRadius: 3,
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: context => formatAnalyticsMoney(context.parsed.y) } }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: value => formatAnalyticsMoney(value) },
          grid: { color: '#e5e7eb' }
        },
        x: { grid: { display: false } }
      }
    }
  });

  const statusColors = {
    Pendiente: '#eab308',
    Pagado: '#22c55e',
    Enviado: '#3b82f6',
    Cancelado: '#ef4444'
  };
  const statusCanvas = document.getElementById('analytics-status-chart');
  analyticsCharts.statuses?.destroy();
  analyticsCharts.statuses = new Chart(statusCanvas, {
    type: 'pie',
    data: {
      labels: data.orderStatuses.map(item => item.status),
      datasets: [{
        data: data.orderStatuses.map(item => item.count),
        backgroundColor: data.orderStatuses.map(item => statusColors[item.status]),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
        tooltip: {
          callbacks: {
            label: context => {
              const status = data.orderStatuses[context.dataIndex];
              return `${status.status}: ${status.count} (${status.percentage.toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });

  renderAnalyticsTable(
    document.getElementById('analytics-products-body'),
    data.topProducts.map(product => [
      'rank', product.productName, product.unitsSold.toLocaleString('es-CL'), formatAnalyticsMoney(product.revenue)
    ]),
    ['rank', 'product', 'units', 'revenue'],
    'No hay ventas de productos en este período.'
  );
  renderAnalyticsTable(
    document.getElementById('analytics-customers-body'),
    data.customers.map(customer => [
      customer.name,
      customer.orderCount.toLocaleString('es-CL'),
      formatAnalyticsMoney(customer.totalSpent),
      formatAnalyticsMoney(customer.averageOrderValue)
    ]),
    ['user', 'orders', 'spent', 'average'],
    'No hay compras de clientes en este período.'
  );
}

async function loadAdminAnalytics() {
  initializeAnalyticsFilters();
  const message = document.getElementById('analytics-message');
  const from = document.getElementById('analytics-from').value;
  const to = document.getElementById('analytics-to').value;
  if (!from || !to || from > to) {
    message.textContent = 'Selecciona un rango de fechas válido.';
    message.classList.remove('hidden');
    return;
  }

  message.classList.add('hidden');
  const query = new URLSearchParams({
    from,
    to,
    granularity: document.getElementById('analytics-granularity').value,
    topLimit: document.getElementById('analytics-top-limit').value
  });

  try {
    const response = await fetch(`${API_URL}/analytics/dashboard?${query}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las métricas.');
    renderAnalyticsDashboard(result);
  } catch (error) {
    message.textContent = error.message || 'Error de conexión al cargar las métricas.';
    message.classList.remove('hidden');
  }
}

document.getElementById('analytics-range-preset').addEventListener('change', event => {
  if (event.target.value !== 'custom') setAnalyticsDatePreset(event.target.value);
});
document.getElementById('analytics-filter-form').addEventListener('submit', event => {
  event.preventDefault();
  loadAdminAnalytics();
});

window.cargarUsuariosAdmin = async () => {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const users = await response.json();
    const usersList = document.getElementById('admin-users-list'); 
    
    if (!usersList) return;
    usersList.innerHTML = ''; 
    
    const pendientes = users.filter(u => {
      const rolDelUsuario = String(u.role || u.rol || '').toLowerCase();
      const estadoDelUsuario = String(u.status || u.estado || '').toLowerCase();
      return rolDelUsuario !== 'admin' && estadoDelUsuario !== 'aprobado';
    });

    if (pendientes.length === 0) {
      usersList.innerHTML = '<p class="p-4 text-gray-500 text-sm text-center">No hay solicitudes pendientes.</p>';
      return;
    }

    pendientes.forEach(u => {
      const estadoVisual = u.status || u.estado || 'PENDIENTE';
      
      usersList.innerHTML += `
        <div class="border-b p-4 flex flex-col gap-3 hover:bg-slate-50">
          <div class="flex justify-between items-start">
            <div>
              <p class="font-bold text-sm text-gray-800">${u.name}</p>
              <p class="text-xs text-gray-500">${u.email}</p>
              <span class="px-2 py-1 mt-1 inline-block text-[10px] rounded-full bg-yellow-200 text-yellow-800 font-bold uppercase">${estadoVisual}</span>
            </div>
          </div>
          
          <!-- CONTROLES DE ADMINISTRADOR -->
          <div class="flex justify-between items-center bg-gray-100 p-2 rounded">
            <select id="role-select-${u.id}" class="text-xs border border-gray-300 rounded p-1 bg-white font-semibold">
              <option value="vendedor">Vendedor</option>
              <option value="distribuidor">Distribuidor</option>
            </select>
            
            <div class="flex gap-2">
              <button onclick="rechazarUsuario(${u.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded font-bold text-xs uppercase shadow transition">Rechazar</button>
              <button onclick="aprobarUsuario(${u.id})" class="bg-black text-orange-500 hover:bg-orange-500 hover:text-black px-3 py-1 rounded font-bold text-xs uppercase shadow transition">Aprobar</button>
            </div>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error('Error cargando usuarios para admin:', error);
  }
};

window.aprobarUsuario = async (id) => {
  const selectElement = document.getElementById(`role-select-${id}`);
  const newRole = selectElement ? selectElement.value : 'vendedor';

  if (!confirm(`¿Aprobar a este usuario como ${newRole.toUpperCase()}?`)) return;
  try {
    await fetch(`${API_URL}/users/${id}/approve`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` 
      },
      // Le mandamos al backend el rol que elegiste en la lista desplegable
      body: JSON.stringify({ role: newRole }) 
    });
    alert('Usuario aprobado exitosamente.');
    cargarUsuariosAdmin(); 
  } catch (error) {
    console.error('Error aprobando usuario:', error);
  }
};

window.rechazarUsuario = async (id) => {
  if (!confirm('¿Estás seguro de rechazar y ELIMINAR esta solicitud?')) return;
  try {
    // Usamos la ruta DELETE de tu backend para borrar al usuario rechazado
    await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    alert('Solicitud rechazada y eliminada.');
    cargarUsuariosAdmin();
  } catch (error) {
    console.error('Error rechazando usuario:', error);
  }
};
window.cargarProductosAdmin = async () => {
  try {
    const response = await fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${authToken}` } 
    });
    const products = await response.json();
    const adminTable = document.getElementById('admin-products-table-body');
    if (!adminTable) return;
    
    adminTable.innerHTML = ''; 
    const pendientes = products.filter(p => p.status === 'pendiente' || !p.status);

    pendientes.forEach(p => {
      const imgSrc = p.imageUrl ? `http://localhost:3000${p.imageUrl}` : 'https://via.placeholder.com/64?text=Sin+Foto';
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-slate-50';
      tr.innerHTML = `
        <td class="p-3"><img src="${imgSrc}" class="w-16 h-16 object-cover rounded shadow-sm"></td>
        <td class="p-3 font-semibold text-gray-800">${p.name} <br> <span class="text-xs text-gray-500">ID Vendedor: ${p.vendedorId}</span></td>
        <td class="p-3 text-blue-600 font-bold">$${p.price}</td>
        <td class="p-3"><span class="px-2 py-1 text-xs rounded-full bg-yellow-200 text-yellow-800 font-bold uppercase">Pendiente</span></td>
        <td class="p-3 text-center">
           <button onclick="aprobarProducto(${p.id})" class="bg-black text-orange-500 hover:bg-orange-500 hover:text-black px-4 py-2 rounded font-bold text-xs uppercase shadow transition">Aprobar</button>
        </td>
      `;
      adminTable.appendChild(tr);
    });
  } catch (error) {
    console.error('Error cargando pendientes para admin:', error);
  }
};

window.aprobarProducto = async (id) => {
  if (!confirm('¿Aprobar este producto para la venta?')) return;
  try {
    await fetch(`${API_URL}/products/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` 
      },
      body: JSON.stringify({ status: 'aprobado' })
    });
    alert('Producto aprobado exitosamente. Ya es visible para distribuidores.');
    cargarProductosAdmin(); 
  } catch (error) {
    console.error('Error aprobando producto:', error);
  }
};

// ==========================================
// 5. PANEL DISTRIBUIDOR (CARRITO)
// ==========================================
let cart = [];
let availableProducts = [];

window.loadDistribuidorProducts = async () => {
  try {
    const response = await fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const products = await response.json();
    availableProducts = products.filter(p => p.status === 'aprobado');
    const select = document.getElementById('dist-product-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecciona un producto aprobado...</option>';
    availableProducts.forEach(p => {
      select.innerHTML += `<option value="${p.id}">${p.name} - $${p.price} (Stock: ${p.stock})</option>`;
    });
  } catch (error) {
    console.error('Error cargando catálogo para distribuidor:', error);
  }
};

window.addToCart = () => {
  const select = document.getElementById('dist-product-select');
  const qtyInput = document.getElementById('dist-quantity');
  
  const productId = parseInt(select.value);
  const qty = parseInt(qtyInput.value);
  
  if (!productId || qty <= 0) return alert('Selecciona un producto y una cantidad válida');
  
  const product = availableProducts.find(p => p.id === productId);
  if (!product) return;
  
  if (qty > product.stock) {
    return alert(`Solo hay ${product.stock} unidades disponibles de este producto.`);
  }

  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    if (existingItem.qty + qty > product.stock) {
      return alert('La cantidad total supera el stock disponible');
    }
    existingItem.qty += qty;
  } else {
    cart.push({ ...product, qty });
  }
  
  renderCart();
};

function renderCart() {
  const cartList = document.getElementById('cart-list');
  const cartTotal = document.getElementById('cart-total');
  
  cartList.innerHTML = '';
  let total = 0;
  
  cart.forEach((item, index) => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    
    cartList.innerHTML += `
      <li class="py-3 flex justify-between items-center">
        <div>
          <p class="font-bold text-gray-800">${item.name}</p>
          <p class="text-xs text-gray-500">${item.qty} x $${item.price}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-black text-black">$${subtotal.toFixed(2)}</span>
          <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-700 font-bold text-lg">×</button>
        </div>
      </li>
    `;
  });
  
  cartTotal.textContent = `$${total.toFixed(2)}`;
}

window.removeFromCart = (index) => {
  cart.splice(index, 1);
  renderCart();
};

// ENVÍA LA ORDEN A LA BASE DE DATOS
window.submitOrder = async () => {
  if (cart.length === 0) return alert('El carrito está vacío');
  
  try {
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
    
    // TRUCO MAESTRO: Traducimos cada producto a TODOS los idiomas posibles para tu backend
    const itemsParaBackend = cart.map(item => ({
      ...item,
      product_id: item.id,
      productId: item.id,
      id_producto: item.id,
      quantity: item.qty,
      cantidad: item.qty
    }));

    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` 
      },
      // Mandamos la lista bajo todos los nombres que tu backend podría estar esperando
      body: JSON.stringify({ 
        total_price: total, 
        total: total, 
        
        items: itemsParaBackend,
        productos: itemsParaBackend,
        products: itemsParaBackend,
        detalles: itemsParaBackend,
        
        // POR SI ACASO tu backend fue programado para comprar solo 1 cosa a la vez sin arreglos:
        product_id: cart[0].id,
        productId: cart[0].id,
        id_producto: cart[0].id,
        quantity: cart[0].qty,
        cantidad: cart[0].qty
      }) 
    });

    if (response.ok) {
      alert('¡Pedido confirmado exitosamente!');
      cart = []; 
      renderCart();
      loadDistribuidorProducts(); 
      loadOrders(); 
    } else {
      const data = await response.json();
      alert('Error al guardar el pedido: ' + (data.error || 'Revisa tu backend.'));
    }
  } catch (error) {
    console.error('Error procesando orden:', error);
    alert('Error de conexión al enviar el pedido.');
  }
};

// CARGA EL HISTORIAL EN LA TABLA
window.loadOrders = async () => {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const orders = await response.json();
    const ordersTable = document.getElementById('orders-table-body');
    
    if (!ordersTable) return;
    ordersTable.innerHTML = '';
    
    if (!orders || orders.length === 0) {
      ordersTable.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Aún no hay compras registradas.</td></tr>';
      return;
    }

    orders.forEach(o => {
      // Usamos las columnas exactas que vimos en tu consola
      const fecha = o.created_at || new Date().toISOString();
      const estado = o.status || 'COMPLETADO';
      const montoTotal = o.total_price || 0;
      const distribuidor = o.distribuidor_name || currentUser.name;

      ordersTable.innerHTML += `
        <tr class="border-b hover:bg-slate-50">
          <td class="p-3 font-bold text-gray-700">#${o.id}</td>
          <td class="p-3">${distribuidor}</td>
          <td class="p-3 text-green-600 font-bold">$${parseFloat(montoTotal).toFixed(2)}</td>
          <td class="p-3 text-xs text-gray-500">${new Date(fecha).toLocaleDateString()}</td>
          <td class="p-3">
             <span class="px-2 py-1 text-[10px] rounded-full bg-blue-100 text-blue-800 font-bold uppercase">${estado}</span>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error cargando historial de compras:', error);
  }
};

// ==========================================
// INTERACCIONES SECUNDARIAS
// ==========================================
document.getElementById('show-register-btn')?.addEventListener('click', () => showSection('public-register-section'));
document.getElementById('back-to-login-btn')?.addEventListener('click', () => showSection('login-section'));
document.getElementById('waiting-ok-btn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.reload();
});

// Arrancar la app
init();
