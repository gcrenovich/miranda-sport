const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
db.init();

// Helper to generate invoice numbers and CAE
function generateCAE() {
  return Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
}

function generateInvoiceNumber(orders, type) {
  const billedOrders = orders.filter(o => o.invoiceNumber && o.invoiceType === type);
  let nextNum = 1;
  if (billedOrders.length > 0) {
    const numbers = billedOrders.map(o => {
      const parts = o.invoiceNumber.split('-');
      return parseInt(parts[1], 10);
    });
    nextNum = Math.max(...numbers) + 1;
  }
  return `0001-${nextNum.toString().padStart(8, '0')}`;
}

// API Routes

// Keep-Alive / Health Check Endpoint
app.get('/api/ping', (req, res) => {
  res.json({ status: 'active', timestamp: new Date().toISOString() });
});

// 1. PRODUCTS API
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const newProduct = await db.createProduct(req.body);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const updatedProduct = await db.updateProduct(req.params.id, req.body);
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const deleted = await db.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully', product: deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. ORDERS API
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/track/:code', async (req, res) => {
  try {
    const orders = await db.getOrders();
    const code = req.params.code.toLowerCase();
    const found = orders.find(o => 
      o.id.toLowerCase() === code || 
      o.id.split('-')[1]?.toLowerCase() === code
    );
    if (!found) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json(found);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, customerCuit, customerEmail, customerPhone, customerAddress, paymentMethod, items } = req.body;

    if (!customerName || !customerPhone || !customerAddress || !items || !items.length) {
      return res.status(400).json({ error: 'Faltan datos obligatorios del cliente (Nombre, Teléfono o Dirección) o artículos en el pedido.' });
    }

    if (customerPhone.trim().replace(/[\s\-\+\(\)]/g, '').length < 8) {
      return res.status(400).json({ error: 'El número de teléfono de contacto debe tener al menos 8 dígitos.' });
    }

    const products = await db.getProducts();

    // Verify stock
    for (const item of items) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) {
        return res.status(400).json({ error: `El producto ${item.name} no existe` });
      }
      if (prod.stock < item.quantity) {
        return res.status(400).json({ error: `Stock insuficiente para el producto: ${prod.name}. Stock disponible: ${prod.stock}` });
      }
    }

    // Calculate prices
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    const tax = Math.round(subtotal * 0.21); // IVA 21%
    const total = subtotal + tax;

    const orderData = {
      customerName,
      customerCuit: customerCuit || '20-00000000-9',
      customerEmail,
      customerPhone,
      customerAddress,
      paymentMethod,
      items,
      subtotal,
      tax,
      total
    };

    const newOrder = await db.createOrder(orderData);
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  try {
    const updateData = {};
    if (req.body.status) {
      updateData.status = req.body.status;
    }
    const updated = await db.updateOrder(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders', async (req, res) => {
  try {
    const result = await db.clearOrders();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mock AFIP Billing Endpoint
app.post('/api/orders/:id/invoice', async (req, res) => {
  try {
    const orders = await db.getOrders();
    const order = orders.find(o => o.id === req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'Facturado') {
      return res.status(400).json({ error: 'El pedido ya ha sido facturado.' });
    }

    // Determine invoice type: if CUIT is provided and long, make it Factura A, else Factura B
    const type = (order.customerCuit && order.customerCuit.length > 11 && order.customerCuit !== '20-00000000-9') ? 'A' : 'B';
    const invoiceNumber = generateInvoiceNumber(orders, type);
    const cae = generateCAE();
    const caeDueDate = new Date();
    caeDueDate.setDate(caeDueDate.getDate() + 10); // CAE valid for 10 days

    const updated = await db.updateOrder(req.params.id, {
      status: 'Facturado',
      invoiceNumber,
      invoiceType: type,
      cae,
      caeDueDate: caeDueDate.toISOString().split('T')[0]
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete order without invoice (Tax-Exempt / Personal deal)
app.post('/api/orders/:id/no-invoice', async (req, res) => {
  try {
    const orders = await db.getOrders();
    const order = orders.find(o => o.id === req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status === 'Facturado' || order.status === 'Completado (Sin Factura)') {
      return res.status(400).json({ error: 'El pedido ya fue cerrado.' });
    }

    const updated = await db.updateOrder(req.params.id, {
      status: 'Completado (Sin Factura)',
      tax: 0,
      total: order.subtotal
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. SETTINGS API
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. USERS API
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.login(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    const users = await db.getUsers();
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
    }
    const newUser = await db.createUser({ username, password, name, role });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    const users = await db.getUsers();
    const userIdx = users.findIndex(u => u.id === req.params.id);
    if (userIdx === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    if (username && username.toLowerCase() !== users[userIdx].username.toLowerCase()) {
      const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
      }
    }

    const updateData = { username, name, role };
    if (password !== undefined && password !== '') {
      updateData.password = password;
    }
    const updated = await db.updateUser(req.params.id, updateData);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const users = await db.getUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el último administrador del sistema' });
      }
    }

    const deleted = await db.deleteUser(req.params.id);
    res.json({ message: 'Usuario eliminado con éxito', user: deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback HTML page path for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de Miranda Sport escuchando en http://localhost:${PORT}`);
});
