// API communication module with fallback to localStorage for offline mode

const API_BASE = window.location.origin;

// Helper to determine if we are running in full local fallback mode (e.g. file:// or server offline)
let isUsingLocalBackup = false;

// Seed initial backup data in localStorage if empty
function initLocalBackup() {
  if (!localStorage.getItem('miranda_products')) {
    const defaultProducts = [
      {
        "id": "prod-1",
        "name": "Cinta de Correr Profesional M100",
        "category": "Cardio",
        "price": 1200000,
        "cost": 800000,
        "stock": 5,
        "description": "Cinta de correr con motor de 3.5 HP, pantalla LED táctil, 12 programas preestablecidos y amortiguación premium para gimnasios de alto tráfico.",
        "image": "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=600&auto=format&fit=crop"
      },
      {
        "id": "prod-2",
        "name": "Bicicleta Fija de Spinning Pro-S",
        "category": "Cardio",
        "price": 450000,
        "cost": 300000,
        "stock": 8,
        "description": "Bicicleta de spinning con volante de inercia de 18kg, resistencia magnética regulable y consola para medir distancia, pulso y calorías.",
        "image": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop"
      },
      {
        "id": "prod-3",
        "name": "Kit Mancuernas Ajustables (2.5 a 24kg)",
        "category": "Fuerza",
        "price": 180000,
        "cost": 120000,
        "stock": 15,
        "description": "Juego de mancuernas inteligentes con dial selector de peso rápido. Reemplaza 15 pares de mancuernas tradicionales ocupando el mínimo espacio.",
        "image": "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?q=80&w=600&auto=format&fit=crop"
      },
      {
        "id": "prod-4",
        "name": "Barra Olímpica Profesional 20kg",
        "category": "Fuerza",
        "price": 120000,
        "cost": 75000,
        "stock": 12,
        "description": "Barra cromada de 2.2 metros, rulemanes de alta resistencia, capacidad de carga hasta 450kg y terminación moleteada antideslizante.",
        "image": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop"
      },
      {
        "id": "prod-5",
        "name": "Disco Olímpico Engomado 10kg",
        "category": "Fuerza",
        "price": 35000,
        "cost": 20000,
        "stock": 40,
        "description": "Disco de hierro fundido recubierto de goma virgen de alta resistencia a impactos. Agarre triple tipo tri-grip para fácil transporte.",
        "image": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop"
      },
      {
        "id": "prod-6",
        "name": "Colchoneta Fitness Alta Densidad",
        "category": "Accesorios",
        "price": 15000,
        "cost": 8000,
        "stock": 3,
        "description": "Colchoneta de 100x50cm, espesor de 4cm en espuma de celda cerrada de alta densidad con funda impermeable y lavable con cierre.",
        "image": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?q=80&w=600&auto=format&fit=crop"
      },
      {
        "id": "prod-7",
        "name": "Banda Elástica de Látex Cerrada (Fuerte)",
        "category": "Accesorios",
        "price": 8000,
        "cost": 4500,
        "stock": 50,
        "description": "Banda de resistencia circular de látex 100% natural, ideal para entrenamientos de tren inferior, calentamiento y dominadas asistidas.",
        "image": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop"
      },
      {
        "id": "prod-8",
        "name": "Multigimnasio de 4 Estaciones M-90",
        "category": "Fuerza",
        "price": 2400000,
        "cost": 1600000,
        "stock": 2,
        "description": "Equipo completo con torre de pesas de 100kg, estación de pecho mariposa, polea alta/baja, prensa de piernas y banco de abdominales.",
        "image": "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=600&auto=format&fit=crop"
      }
    ];
    localStorage.setItem('miranda_products', JSON.stringify(defaultProducts));
  }

  if (!localStorage.getItem('miranda_orders')) {
    localStorage.setItem('miranda_orders', JSON.stringify([]));
  } else {
    // Automatically clear any old example orders so the user starts completely fresh
    try {
      const savedOrders = JSON.parse(localStorage.getItem('miranda_orders'));
      if (Array.isArray(savedOrders) && savedOrders.some(o => o.customerName === "Gimnasio Iron Fists" || o.customerName === "Mariana López")) {
        localStorage.setItem('miranda_orders', JSON.stringify([]));
      }
    } catch (e) {
      console.error('Error auto-clearing example orders:', e);
    }
  }

  if (!localStorage.getItem('miranda_users')) {
    const defaultUsers = [
      { id: 'usr-1', username: 'admin', password: 'admin', role: 'admin', name: 'Administrador General' },
      { id: 'usr-2', username: 'vendedor', password: 'vendedor', role: 'vendedor', name: 'Vendedor de Salón' }
    ];
    localStorage.setItem('miranda_users', JSON.stringify(defaultUsers));
  }
}

// Check server status
async function checkServer() {
  if (window.location.protocol.startsWith('file')) {
    isUsingLocalBackup = true;
    initLocalBackup();
    console.log('Miranda Sport: Running from local HTML file. Custom localStorage database enabled.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/products`, { method: 'HEAD' });
    isUsingLocalBackup = !res.ok;
  } catch (e) {
    isUsingLocalBackup = true;
    console.log('Miranda Sport: Server offline. Custom localStorage database enabled.');
  }
  initLocalBackup();
}

// Exportable API Functions
const API = {
  async init() {
    await checkServer();
  },

  isLocalMode() {
    return isUsingLocalBackup;
  },

  async getProducts() {
    if (isUsingLocalBackup) {
      return JSON.parse(localStorage.getItem('miranda_products'));
    }
    const response = await fetch(`${API_BASE}/api/products`);
    return await response.json();
  },

  async createProduct(productData) {
    if (isUsingLocalBackup) {
      const products = JSON.parse(localStorage.getItem('miranda_products'));
      const newProduct = {
        id: 'prod-' + Date.now(),
        ...productData,
        price: Number(productData.price) || 0,
        cost: Number(productData.cost) || 0,
        stock: Number(productData.stock) || 0
      };
      products.push(newProduct);
      localStorage.setItem('miranda_products', JSON.stringify(products));
      return newProduct;
    }

    const response = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    return await response.json();
  },

  async updateProduct(id, productData) {
    if (isUsingLocalBackup) {
      const products = JSON.parse(localStorage.getItem('miranda_products'));
      const idx = products.findIndex(p => p.id === id);
      if (idx !== -1) {
        products[idx] = {
          ...products[idx],
          ...productData,
          price: productData.price !== undefined ? Number(productData.price) : products[idx].price,
          cost: productData.cost !== undefined ? Number(productData.cost) : products[idx].cost,
          stock: productData.stock !== undefined ? Number(productData.stock) : products[idx].stock
        };
        localStorage.setItem('miranda_products', JSON.stringify(products));
        return products[idx];
      }
      throw new Error('Product not found');
    }

    const response = await fetch(`${API_BASE}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    return await response.json();
  },

  async deleteProduct(id) {
    if (isUsingLocalBackup) {
      const products = JSON.parse(localStorage.getItem('miranda_products'));
      const filtered = products.filter(p => p.id !== id);
      localStorage.setItem('miranda_products', JSON.stringify(filtered));
      return { message: 'Product deleted' };
    }

    const response = await fetch(`${API_BASE}/api/products/${id}`, {
      method: 'DELETE'
    });
    return await response.json();
  },

  async getOrders() {
    if (isUsingLocalBackup) {
      return JSON.parse(localStorage.getItem('miranda_orders'));
    }
    const response = await fetch(`${API_BASE}/api/orders`);
    return await response.json();
  },

  async trackOrder(code) {
    if (isUsingLocalBackup) {
      const orders = JSON.parse(localStorage.getItem('miranda_orders') || '[]');
      const found = orders.find(o => 
        o.id.toLowerCase() === code.toLowerCase() || 
        o.id.split('-')[1]?.toLowerCase() === code.toLowerCase()
      );
      return found || null;
    }
    const response = await fetch(`${API_BASE}/api/orders/track/${code}`);
    if (response.status === 404) return null;
    return await response.json();
  },

  async createOrder(orderData) {
    if (isUsingLocalBackup) {
      const products = JSON.parse(localStorage.getItem('miranda_products'));
      const orders = JSON.parse(localStorage.getItem('miranda_orders'));

      // Validate stock
      for (const item of orderData.items) {
        const prod = products.find(p => p.id === item.productId);
        if (!prod || prod.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.name}`);
        }
      }

      // Deduct stock
      orderData.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        prod.stock -= item.quantity;
      });

      let subtotal = 0;
      orderData.items.forEach(item => {
        subtotal += item.price * item.quantity;
      });
      const tax = Math.round(subtotal * 0.21);
      const total = subtotal + tax;

      const newOrder = {
        id: 'ord-' + Date.now(),
        ...orderData,
        subtotal,
        tax,
        total,
        status: 'Pendiente',
        date: new Date().toISOString()
      };

      orders.push(newOrder);
      localStorage.setItem('miranda_products', JSON.stringify(products));
      localStorage.setItem('miranda_orders', JSON.stringify(orders));
      return newOrder;
    }

    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error creando pedido');
    }
    return await response.json();
  },

  async updateOrderStatus(id, status) {
    if (isUsingLocalBackup) {
      const orders = JSON.parse(localStorage.getItem('miranda_orders'));
      const idx = orders.findIndex(o => o.id === id);
      if (idx !== -1) {
        orders[idx].status = status;
        localStorage.setItem('miranda_orders', JSON.stringify(orders));
        return orders[idx];
      }
      throw new Error('Order not found');
    }

    const response = await fetch(`${API_BASE}/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await response.json();
  },

  async invoiceOrder(id) {
    if (isUsingLocalBackup) {
      const orders = JSON.parse(localStorage.getItem('miranda_orders'));
      const idx = orders.findIndex(o => o.id === id);
      if (idx === -1) throw new Error('Order not found');

      const order = orders[idx];
      if (order.status === 'Facturado') throw new Error('Ya facturado');

      const type = (order.customerCuit && order.customerCuit.length > 11 && order.customerCuit !== '20-00000000-9') ? 'A' : 'B';
      
      // Generate mock invoice numbers
      const billedOrders = orders.filter(o => o.invoiceNumber && o.invoiceType === type);
      let nextNum = 1;
      if (billedOrders.length > 0) {
        const numbers = billedOrders.map(o => parseInt(o.invoiceNumber.split('-')[1], 10));
        nextNum = Math.max(...numbers) + 1;
      }
      const invoiceNumber = `0001-${nextNum.toString().padStart(8, '0')}`;
      const cae = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
      const caeDueDate = new Date();
      caeDueDate.setDate(caeDueDate.getDate() + 10);

      order.status = 'Facturado';
      order.invoiceNumber = invoiceNumber;
      order.invoiceType = type;
      order.cae = cae;
      order.caeDueDate = caeDueDate.toISOString().split('T')[0];

      localStorage.setItem('miranda_orders', JSON.stringify(orders));
      return order;
    }

    const response = await fetch(`${API_BASE}/api/orders/${id}/invoice`, {
      method: 'POST'
    });
    return await response.json();
  },

  async completeOrderWithoutInvoice(id) {
    if (isUsingLocalBackup) {
      const orders = JSON.parse(localStorage.getItem('miranda_orders'));
      const idx = orders.findIndex(o => o.id === id);
      if (idx === -1) throw new Error('Order not found');

      const order = orders[idx];
      if (order.status === 'Facturado' || order.status === 'Completado (Sin Factura)') {
        throw new Error('El pedido ya fue cerrado.');
      }

      order.status = 'Completado (Sin Factura)';
      order.tax = 0;
      order.total = order.subtotal;

      localStorage.setItem('miranda_orders', JSON.stringify(orders));
      return order;
    }

    const response = await fetch(`${API_BASE}/api/orders/${id}/no-invoice`, {
      method: 'POST'
    });
    return await response.json();
  },

  async getSettings() {
    if (isUsingLocalBackup) {
      if (!localStorage.getItem('miranda_settings')) {
        const defaultSettings = {
          heroTitle: "Energía que impulsa tu rendimiento",
          heroDesc: "Fabricamos e importamos instrumentos deportivos de máxima durabilidad y diseño ergonómico para gimnasios y deportistas profesionales.",
          heroImage: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=800&auto=format&fit=crop",
          themeColor: "pink",
          glowEffects: false
        };
        localStorage.setItem('miranda_settings', JSON.stringify(defaultSettings));
      }
      return JSON.parse(localStorage.getItem('miranda_settings'));
    }

    const response = await fetch(`${API_BASE}/api/settings`);
    return await response.json();
  },

  async updateSettings(settingsData) {
    if (isUsingLocalBackup) {
      localStorage.setItem('miranda_settings', JSON.stringify(settingsData));
      return settingsData;
    }

    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsData)
    });
    return await response.json();
  },

  async login(username, password) {
    if (isUsingLocalBackup) {
      const users = JSON.parse(localStorage.getItem('miranda_users') || '[]');
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
      if (!user) {
        throw new Error('Usuario o contraseña incorrectos');
      }
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      };
    }

    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error de autenticación');
    }
    return await response.json();
  },

  async getUsers() {
    if (isUsingLocalBackup) {
      return JSON.parse(localStorage.getItem('miranda_users') || '[]');
    }
    const response = await fetch(`${API_BASE}/api/users`);
    return await response.json();
  },

  async createUser(userData) {
    if (isUsingLocalBackup) {
      const users = JSON.parse(localStorage.getItem('miranda_users') || '[]');
      const exists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
      if (exists) {
        throw new Error('El nombre de usuario ya está registrado');
      }
      const newUser = {
        id: 'usr-' + Date.now(),
        ...userData
      };
      users.push(newUser);
      localStorage.setItem('miranda_users', JSON.stringify(users));
      return newUser;
    }

    const response = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error creando usuario');
    }
    return await response.json();
  },

  async updateUser(id, userData) {
    if (isUsingLocalBackup) {
      const users = JSON.parse(localStorage.getItem('miranda_users') || '[]');
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) throw new Error('Usuario no encontrado');

      if (userData.username && userData.username.toLowerCase() !== users[idx].username.toLowerCase()) {
        const exists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
        if (exists) {
          throw new Error('El nombre de usuario ya está registrado');
        }
      }

      const updated = {
        ...users[idx],
        username: userData.username !== undefined ? userData.username : users[idx].username,
        name: userData.name !== undefined ? userData.name : users[idx].name,
        role: userData.role !== undefined ? userData.role : users[idx].role
      };
      if (userData.password !== undefined && userData.password !== '') {
        updated.password = userData.password;
      }
      users[idx] = updated;
      localStorage.setItem('miranda_users', JSON.stringify(users));
      return updated;
    }

    const response = await fetch(`${API_BASE}/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error actualizando usuario');
    }
    return await response.json();
  },

  async deleteUser(id) {
    if (isUsingLocalBackup) {
      const users = JSON.parse(localStorage.getItem('miranda_users') || '[]');
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) throw new Error('Usuario no encontrado');

      const userToDelete = users[idx];
      if (userToDelete.role === 'admin') {
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
          throw new Error('No se puede eliminar el último administrador del sistema');
        }
      }

      const filtered = users.filter(u => u.id !== id);
      localStorage.setItem('miranda_users', JSON.stringify(filtered));
      return { message: 'Usuario eliminado con éxito' };
    }

    const response = await fetch(`${API_BASE}/api/users/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error eliminando usuario');
    }
    return await response.json();
  }
};

window.API = API;
