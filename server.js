const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions for reading/writing the database JSON
function readDB() {
  try {
    const defaultUsers = [
      { id: 'usr-1', username: 'admin', password: 'admin', role: 'admin', name: 'Administrador General' },
      { id: 'usr-2', username: 'vendedor', password: 'vendedor', role: 'vendedor', name: 'Vendedor de Salón' }
    ];

    if (!fs.existsSync(DB_FILE)) {
      return { products: [], orders: [], users: defaultUsers };
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    
    if (!db.products) db.products = [];
    if (!db.orders) db.orders = [];
    if (!db.users) {
      db.users = defaultUsers;
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    }
    return db;
  } catch (error) {
    console.error('Error reading database file:', error);
    return { products: [], orders: [], users: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
}

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

// 1. PRODUCTS API
app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json(db.products);
});

app.post('/api/products', (req, res) => {
  const db = readDB();
  const newProduct = {
    id: 'prod-' + Date.now(),
    name: req.body.name,
    category: req.body.category || 'General',
    price: Number(req.body.price) || 0,
    cost: Number(req.body.cost) || 0,
    stock: Number(req.body.stock) || 0,
    description: req.body.description || '',
    image: req.body.image || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop'
  };

  db.products.push(newProduct);
  writeDB(db);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex(p => p.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const updatedProduct = {
    ...db.products[idx],
    name: req.body.name !== undefined ? req.body.name : db.products[idx].name,
    category: req.body.category !== undefined ? req.body.category : db.products[idx].category,
    price: req.body.price !== undefined ? Number(req.body.price) : db.products[idx].price,
    cost: req.body.cost !== undefined ? Number(req.body.cost) : db.products[idx].cost,
    stock: req.body.stock !== undefined ? Number(req.body.stock) : db.products[idx].stock,
    description: req.body.description !== undefined ? req.body.description : db.products[idx].description,
    image: req.body.image !== undefined ? req.body.image : db.products[idx].image
  };

  db.products[idx] = updatedProduct;
  writeDB(db);
  res.json(updatedProduct);
});

app.delete('/api/products/:id', (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex(p => p.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const deleted = db.products.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Product deleted successfully', product: deleted[0] });
});

// 2. ORDERS API
app.get('/api/orders', (req, res) => {
  const db = readDB();
  res.json(db.orders);
});

app.post('/api/orders', (req, res) => {
  const db = readDB();
  const { customerName, customerCuit, customerEmail, customerPhone, customerAddress, paymentMethod, items } = req.body;

  if (!customerName || !items || !items.length) {
    return res.status(400).json({ error: 'Faltan datos del cliente o items del pedido' });
  }

  // Verify stock and update it
  for (const item of items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (!prod) {
      return res.status(400).json({ error: `El producto ${item.name} no existe` });
    }
    if (prod.stock < item.quantity) {
      return res.status(400).json({ error: `Stock insuficiente para el producto: ${prod.name}. Stock disponible: ${prod.stock}` });
    }
  }

  // Deduct stock
  items.forEach(item => {
    const prod = db.products.find(p => p.id === item.productId);
    prod.stock -= item.quantity;
  });

  // Calculate prices
  let subtotal = 0;
  items.forEach(item => {
    subtotal += item.price * item.quantity;
  });
  const tax = Math.round(subtotal * 0.21); // IVA 21%
  const total = subtotal + tax;

  const newOrder = {
    id: 'ord-' + Date.now(),
    customerName,
    customerCuit: customerCuit || '20-00000000-9',
    customerEmail,
    customerPhone,
    customerAddress,
    paymentMethod,
    items,
    subtotal,
    tax,
    total,
    status: 'Pendiente',
    date: new Date().toISOString()
  };

  db.orders.push(newOrder);
  writeDB(db);
  res.status(201).json(newOrder);
});

app.patch('/api/orders/:id', (req, res) => {
  const db = readDB();
  const idx = db.orders.findIndex(o => o.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (req.body.status) {
    db.orders[idx].status = req.body.status;
  }

  writeDB(db);
  res.json(db.orders[idx]);
});

// Mock AFIP Billing Endpoint
app.post('/api/orders/:id/invoice', (req, res) => {
  const db = readDB();
  const idx = db.orders.findIndex(o => o.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = db.orders[idx];
  if (order.status === 'Facturado') {
    return res.status(400).json({ error: 'El pedido ya ha sido facturado.' });
  }

  // Determine invoice type: if CUIT is provided and long, make it Factura A, else Factura B
  const type = (order.customerCuit && order.customerCuit.length > 11 && order.customerCuit !== '20-00000000-9') ? 'A' : 'B';
  const invoiceNumber = generateInvoiceNumber(db.orders, type);
  const cae = generateCAE();
  const caeDueDate = new Date();
  caeDueDate.setDate(caeDueDate.getDate() + 10); // CAE valid for 10 days

  // Update order with billing details
  order.status = 'Facturado';
  order.invoiceNumber = invoiceNumber;
  order.invoiceType = type;
  order.cae = cae;
  order.caeDueDate = caeDueDate.toISOString().split('T')[0];

  writeDB(db);
  res.json(order);
});

// Complete order without invoice (Tax-Exempt / Personal deal)
app.post('/api/orders/:id/no-invoice', (req, res) => {
  const db = readDB();
  const idx = db.orders.findIndex(o => o.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = db.orders[idx];
  if (order.status === 'Facturado' || order.status === 'Completado (Sin Factura)') {
    return res.status(400).json({ error: 'El pedido ya fue cerrado.' });
  }

  // Update order details to be tax-exempt
  order.status = 'Completado (Sin Factura)';
  order.tax = 0;
  order.total = order.subtotal; // Subtotal only, tax is zero

  writeDB(db);
  res.json(order);
});

// 3. SETTINGS API
app.get('/api/settings', (req, res) => {
  const db = readDB();
  const defaultSettings = {
    heroTitle: "Energía que impulsa tu rendimiento",
    heroDesc: "Fabricamos e importamos instrumentos deportivos de máxima durabilidad y diseño ergonómico para gimnasios y deportistas profesionales.",
    heroImage: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=800&auto=format&fit=crop",
    themeColor: "pink",
    glowEffects: false
  };
  
  if (!db.settings) {
    db.settings = defaultSettings;
    writeDB(db);
  }
  res.json(db.settings);
});

app.post('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = {
    heroTitle: req.body.heroTitle,
    heroDesc: req.body.heroDesc,
    heroImage: req.body.heroImage,
    themeColor: req.body.themeColor || "pink",
    glowEffects: req.body.glowEffects === true
  };
  writeDB(db);
  res.json(db.settings);
});

// 4. USERS API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  });
});

app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(db.users);
});

app.post('/api/users', (req, res) => {
  const db = readDB();
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
  }
  const newUser = {
    id: 'usr-' + Date.now(),
    username,
    password,
    name,
    role
  };
  db.users.push(newUser);
  writeDB(db);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  const { username, password, name, role } = req.body;
  
  if (username && username.toLowerCase() !== db.users[idx].username.toLowerCase()) {
    const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
    }
  }

  const updatedUser = {
    ...db.users[idx],
    username: username !== undefined ? username : db.users[idx].username,
    name: name !== undefined ? name : db.users[idx].name,
    role: role !== undefined ? role : db.users[idx].role
  };
  if (password !== undefined && password !== '') {
    updatedUser.password = password;
  }
  db.users[idx] = updatedUser;
  writeDB(db);
  res.json(updatedUser);
});

app.delete('/api/users/:id', (req, res) => {
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  
  const userToDelete = db.users[idx];
  if (userToDelete.role === 'admin') {
    const adminCount = db.users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'No se puede eliminar el último administrador del sistema' });
    }
  }

  const deleted = db.users.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Usuario eliminado con éxito', user: deleted[0] });
});

// Fallback HTML page path for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de Miranda Sport escuchando en http://localhost:${PORT}`);
});
