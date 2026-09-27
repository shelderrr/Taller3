const API_URL = 'http://localhost:3000/api';
let authToken = '';

// Referencias HTML
const distProductSelect = document.getElementById('dist-product-select');
const distQuantity = document.getElementById('dist-quantity');
const cartList = document.getElementById('cart-list');
const cartTotalLabel = document.getElementById('cart-total');
const ordersTableBody = document.getElementById('orders-table-body');
let availableProducts = [];
let cart = [];
const loginSection = document.getElementById('login-section');
const publicRegisterSection = document.getElementById('public-register-section');
const waitingSection = document.getElementById('waiting-section');
const adminSection = document.getElementById('admin-section');
const vendedorSection = document.getElementById('vendedor-section');
const distribuidorSection = document.getElementById('distribuidor-section');

const loginForm = document.getElementById('login-form');
const publicRegisterForm = document.getElementById('public-register-form');
const usersTableBody = document.getElementById('users-table-body');
const adminProductsTableBody = document.getElementById('admin-products-table-body');
const productForm = document.getElementById('product-form');
const productsTableBody = document.getElementById('products-table-body');
const loginError = document.getElementById('login-error');

// --- NAVEGACIÓN BÁSICA ---
document.getElementById('show-register-btn').addEventListener('click', () => {
  loginSection.classList.add('hidden');
  publicRegisterSection.classList.remove('hidden');
});

document.getElementById('back-to-login-btn').addEventListener('click', () => {
  publicRegisterSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
});

document.getElementById('waiting-ok-btn').addEventListener('click', () => {
  waitingSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
});

// --- CERRAR SESIÓN (Global para todos los roles) ---
document.querySelectorAll('.logout-btn, #logout-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    authToken = ''; 
    adminSection.classList.add('hidden');
    vendedorSection.classList.add('hidden');
    distribuidorSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  });
});

// --- 1. REGISTRO PÚBLICO ---
publicRegisterForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (response.ok) {
      alert('Solicitud enviada. Debes esperar la aprobación del administrador.');
      publicRegisterForm.reset();
      publicRegisterSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
    } else {
      const data = await response.json();
      alert(data.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

// --- 2. INICIO DE SESIÓN ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.error === 'CUENTA_PENDIENTE') {
      loginForm.reset();
      loginSection.classList.add('hidden');
      waitingSection.classList.remove('hidden');
      return;
    }

    if (!response.ok) throw new Error(data.error || 'Error al iniciar sesión');

    authToken = data.token;
    loginError.classList.add('hidden');
    loginForm.reset();
    
    // Enrutamiento según el rol
    if (data.user.role === 'admin') {
      loginSection.classList.add('hidden');
      adminSection.classList.remove('hidden');
      loadUsers();
      loadAdminProducts(); // Cargar tabla de productos pendientes para el admin
    } else if (data.user.role === 'vendedor') {
      loginSection.classList.add('hidden');
      vendedorSection.classList.remove('hidden');
      loadProducts(); // Cargar catálogo para el vendedor
    } else if (data.user.role === 'distribuidor') {
      loginSection.classList.add('hidden');
      distribuidorSection.classList.remove('hidden');
loadDistributorData(); // <-- NUEVO 
    }

  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  }
});

// --- 3. LISTAR USUARIOS (ADMIN) ---
async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const users = await response.json();
    usersTableBody.innerHTML = '';

    users.forEach(user => {
      if (user.role === 'admin') return; 

      const isPending = user.status === 'pendiente';
      
      const roleSelect = isPending ? `
        <select id="role-${user.id}" class="border p-1 rounded text-sm">
          <option value="vendedor">Vendedor (Producto)</option>
          <option value="distribuidor">Distribuidor (Pedido)</option>
        </select>
      ` : `<span class="capitalize">${user.role}</span>`;

      const approveBtn = isPending ? `
        <button onclick="approveUser(${user.id})" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm mr-2">Aprobar</button>
      ` : '';

      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-slate-50';
      tr.innerHTML = `
        <td class="p-3">${user.name}</td>
        <td class="p-3">${user.email}</td>
        <td class="p-3">${roleSelect}</td>
        <td class="p-3">
          <span class="px-2 py-1 text-xs rounded-full ${isPending ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'}">
            ${user.status}
          </span>
        </td>
        <td class="p-3 text-center">
          ${approveBtn}
          <button onclick="deleteUser(${user.id})" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm">Eliminar</button>
        </td>
      `;
      usersTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error cargando usuarios:', error);
  }
}

// --- 4. APROBAR O ELIMINAR USUARIO (ADMIN) ---
window.approveUser = async (id) => {
  const roleSelect = document.getElementById(`role-${id}`);
  const role = roleSelect.value;

  try {
    const response = await fetch(`${API_URL}/users/${id}/approve`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` 
      },
      body: JSON.stringify({ role })
    });

    if (response.ok) {
      loadUsers(); 
    } else {
      const data = await response.json();
      alert(data.error);
    }
  } catch (error) {
    console.error('Error aprobando:', error);
  }
};

window.deleteUser = async (id) => {
  if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
  try {
    await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    loadUsers();
  } catch (error) {
    console.error('Error eliminando:', error);
  }
};

// ==========================================
// --- MÓDULO DEL VENDEDOR (PRODUCTOS) ---
// ==========================================

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  formData.append('name', document.getElementById('prod-name').value);
  formData.append('price', document.getElementById('prod-price').value);
  formData.append('stock', document.getElementById('prod-stock').value);
  
  const imageFile = document.getElementById('prod-image').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  try {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}` 
      },
      body: formData
    });

    if (response.ok) {
      productForm.reset();
      loadProducts(); 
    } else {
      const data = await response.json();
      alert(data.error || 'Error al guardar producto');
    }
  } catch (error) {
    console.error('Error registrando producto:', error);
  }
});

async function loadProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();
    productsTableBody.innerHTML = '';

    products.forEach(p => {
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-slate-50';
      
      const imgSrc = p.imageUrl ? `http://localhost:3000${p.imageUrl}` : 'https://via.placeholder.com/64?text=Sin+Foto';

      tr.innerHTML = `
        <td class="p-3"><img src="${imgSrc}" class="w-16 h-16 object-cover rounded shadow-sm"></td>
        <td class="p-3 font-semibold text-gray-800">${p.name} <br> <span class="text-xs text-gray-500 font-normal">Ofrecido por: ${p.vendedorName || 'Tí'}</span></td>
        <td class="p-3 text-blue-600 font-bold">$${p.price}</td>
        <td class="p-3">${p.stock} uds.</td>
        <td class="p-3">
          <span class="px-2 py-1 text-xs rounded-full ${p.status === 'aprobado' ? 'bg-green-200 text-green-800' : (p.status === 'rechazado' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800')}">
            ${p.status}
          </span>
        </td>
        <td class="p-3 text-center">
          <button onclick="deleteProduct(${p.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm shadow">Eliminar</button>
        </td>
      `;
      productsTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error cargando catálogo:', error);
  }
}

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
// --- MÓDULO DEL ADMIN (APROBAR PRODUCTOS) ---
// ==========================================

async function loadAdminProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();
    adminProductsTableBody.innerHTML = '';

    products.forEach(p => {
      const imgSrc = p.imageUrl ? `http://localhost:3000${p.imageUrl}` : 'https://via.placeholder.com/64?text=Sin+Foto';
      
      let actionBtns = '';
      if (p.status === 'pendiente') {
        actionBtns = `
          <button onclick="updateProductStatus(${p.id}, 'aprobado')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm mr-1">Aprobar</button>
          <button onclick="updateProductStatus(${p.id}, 'rechazado')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm">Rechazar</button>
        `;
      }

      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-slate-50';
      tr.innerHTML = `
        <td class="p-3"><img src="${imgSrc}" class="w-12 h-12 object-cover rounded shadow-sm"></td>
        <td class="p-3">${p.name} <br> <span class="text-xs text-gray-500">$${p.price} | ${p.stock} uds.</span></td>
        <td class="p-3">${p.vendedorName || 'Desconocido'}</td>
        <td class="p-3">
          <span class="px-2 py-1 text-xs rounded-full ${p.status === 'aprobado' ? 'bg-green-200 text-green-800' : (p.status === 'rechazado' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800')}">
            ${p.status}
          </span>
        </td>
        <td class="p-3 text-center">${actionBtns}</td>
      `;
      adminProductsTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error cargando productos para admin:', error);
  }
}

window.updateProductStatus = async (id, status) => {
  try {
    const response = await fetch(`${API_URL}/products/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` 
      },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      loadAdminProducts(); 
    } else {
      const data = await response.json();
      alert(data.error);
    }
  } catch (error) {
    console.error('Error actualizando producto:', error);
  }
};
// ==========================================
// --- MÓDULO DEL DISTRIBUIDOR (PEDIDOS) ---
// ==========================================

async function loadDistributorData() {
  try {
    // 1. Cargar productos aprobados para el select
    const prodRes = await fetch(`${API_URL}/products`);
    const products = await prodRes.json();
    availableProducts = products.filter(p => p.status === 'aprobado');
    
    distProductSelect.innerHTML = '<option value="">Selecciona un producto...</option>';
    availableProducts.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.name} - $${p.price} (Por: ${p.vendedorName || 'N/A'})`;
      distProductSelect.appendChild(option);
    });

    // 2. Cargar el historial de pedidos
    loadOrders();
  } catch (error) {
    console.error('Error cargando datos del distribuidor:', error);
  }
}

window.addToCart = () => {
  const prodId = parseInt(distProductSelect.value);
  const qty = parseInt(distQuantity.value);

  if (!prodId || qty < 1) return alert('Selecciona un producto y una cantidad válida.');

  const product = availableProducts.find(p => p.id === prodId);
  const subtotal = product.price * qty;

  cart.push({
    productId: product.id,
    name: product.name,
    quantity: qty,
    price: product.price,
    subtotal: subtotal
  });

  updateCartUI();
};

function updateCartUI() {
  cartList.innerHTML = '';
  let total = 0;

  cart.forEach((item, index) => {
    total += item.subtotal;
    const li = document.createElement('li');
    li.className = 'py-2 flex justify-between items-center';
    li.innerHTML = `
      <span>${item.quantity}x <strong>${item.name}</strong></span>
      <span>$${item.subtotal.toFixed(2)} 
        <button onclick="removeFromCart(${index})" class="text-red-500 ml-2 font-bold hover:underline">X</button>
      </span>
    `;
    cartList.appendChild(li);
  });

  cartTotalLabel.textContent = `$${total.toFixed(2)}`;
}

window.removeFromCart = (index) => {
  cart.splice(index, 1);
  updateCartUI();
};

window.submitOrder = async () => {
  if (cart.length === 0) return alert('El carrito está vacío.');

  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` 
      },
      body: JSON.stringify({ items: cart })
    });

    if (response.ok) {
      alert('Pedido registrado con éxito!');
      cart = []; // Vaciar carrito
      updateCartUI();
      loadOrders(); // Refrescar tabla
    } else {
      const data = await response.json();
      alert(data.error);
    }
  } catch (error) {
    console.error('Error procesando el pedido:', error);
  }
};

async function loadOrders() {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const orders = await response.json();
    ordersTableBody.innerHTML = '';

    orders.forEach(o => {
      const date = new Date(o.created_at).toLocaleDateString('es-MX', { hour: '2-digit', minute:'2-digit' });
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-slate-50';
      tr.innerHTML = `
        <td class="p-3 font-mono font-bold">#${o.id.toString().padStart(4, '0')}</td>
        <td class="p-3">${o.distribuidor_name}</td>
        <td class="p-3 font-bold text-green-700">$${parseFloat(o.total_price).toFixed(2)}</td>
        <td class="p-3 text-sm text-gray-500">${date}</td>
        <td class="p-3">
          <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${o.status}</span>
        </td>
      `;
      ordersTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error cargando historial de pedidos:', error);
  }
}
