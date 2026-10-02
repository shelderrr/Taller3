const API_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));

// ==========================================
// 1. NAVEGACIÓN Y RUTEO
// ==========================================
function showSection(sectionId) {
  const sections = [
    'login-section', 'public-register-section', 'waiting-section',
    'admin-section', 'vendedor-section', 'distribuidor-section'
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
      errorMsg.textContent = data.error || data.message || 'Correo o contraseña incorrectos.';
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

  try {
    const res = await fetch(`${API_URL}/users`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'vendedor' })
    });
    
    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw new Error("Respuesta inválida del servidor");
    }

    if (res.ok) {
      alert('Solicitud enviada. Un administrador revisará tu cuenta.');
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
