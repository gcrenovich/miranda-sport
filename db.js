const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DB_FILE = path.join(__dirname, 'database.json');
const MONGO_URI = process.env.MONGODB_URI;
const useMongoDB = !!MONGO_URI;

// Define Schemas for Mongoose
const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: 'General' },
  price: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  description: { type: String, default: '' },
  image: { type: String, default: '' }
}, { timestamps: true });

const OrderItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  price: Number,
  quantity: Number
});

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerCuit: { type: String, default: '20-00000000-9' },
  customerEmail: String,
  customerPhone: String,
  customerAddress: String,
  paymentMethod: String,
  items: [OrderItemSchema],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: { type: String, default: 'Pendiente' },
  date: { type: String, default: () => new Date().toISOString() },
  invoiceNumber: String,
  invoiceType: String,
  cae: String,
  caeDueDate: String
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'vendedor' },
  name: { type: String, required: true }
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  heroTitle: { type: String, default: "Energía que impulsa tu rendimiento" },
  heroDesc: { type: String, default: "Fabricamos e importamos instrumentos deportivos de máxima durabilidad y diseño ergonómico..." },
  heroImage: { type: String, default: "" },
  themeColor: { type: String, default: "pink" },
  glowEffects: { type: Boolean, default: false }
}, { timestamps: true });

// Mongoose Models
let Product, Order, User, Settings;
if (useMongoDB) {
  Product = mongoose.model('Product', ProductSchema);
  Order = mongoose.model('Order', OrderSchema);
  User = mongoose.model('User', UserSchema);
  Settings = mongoose.model('Settings', SettingsSchema);
}

// ----------------------------------------------------
// LOCAL FILE SYSTEM BACKUP SYSTEM (HELPER FUNCTIONS)
// ----------------------------------------------------
function readLocalDB() {
  try {
    const defaultUsers = [
      { id: 'usr-1', username: 'admin', password: 'admin', role: 'admin', name: 'Administrador General' },
      { id: 'usr-2', username: 'vendedor', password: 'vendedor', role: 'vendedor', name: 'Vendedor de Salón' }
    ];

    if (!fs.existsSync(DB_FILE)) {
      return { products: [], orders: [], users: defaultUsers, settings: null };
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    
    if (!db.products) db.products = [];
    if (!db.orders) db.orders = [];
    if (!db.users) db.users = defaultUsers;
    return db;
  } catch (error) {
    console.error('Error reading database file:', error);
    return { products: [], orders: [], users: [], settings: null };
  }
}

function writeLocalDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
}

// Helper to remove Mongoose internal properties like _id and __v
function toCleanObject(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj._id;
  delete obj.__v;
  if (obj.items && Array.isArray(obj.items)) {
    obj.items = obj.items.map(item => {
      delete item._id;
      return item;
    });
  }
  return obj;
}

// ----------------------------------------------------
// DATABASE CONTROLLER OBJECT
// ----------------------------------------------------
const db = {
  isMongoDB: useMongoDB,

  async init() {
    if (useMongoDB) {
      console.log('Miranda Sport: Conectando a MongoDB Atlas...');
      try {
        await mongoose.connect(MONGO_URI);
        console.log('Miranda Sport: Conexión exitosa a MongoDB Atlas.');
        
        // Seed initial data if DB is empty
        await this.seedInitialData();
      } catch (err) {
        console.error('Miranda Sport: Error crítico al conectar a MongoDB:', err.message);
        console.log('Miranda Sport: Reintentando conexión en segundo plano...');
      }
    } else {
      console.log('Miranda Sport: MONGODB_URI no detectado. Utilizando base de datos local (database.json).');
      // Ensure local file exists with defaults
      const local = readLocalDB();
      writeLocalDB(local);
    }
  },

  async seedInitialData() {
    try {
      const productCount = await Product.countDocuments();
      const userCount = await User.countDocuments();
      const settingsCount = await Settings.countDocuments();

      // If MongoDB is completely empty, import from local database.json or defaults
      if (productCount === 0 && userCount === 0) {
        console.log('Miranda Sport: Base de datos vacía detectada en MongoDB. Sembrando datos iniciales...');
        const localData = readLocalDB();

        if (localData.products && localData.products.length > 0) {
          await Product.insertMany(localData.products);
          console.log(`Miranda Sport: ${localData.products.length} productos migrados a MongoDB.`);
        }

        if (localData.users && localData.users.length > 0) {
          await User.insertMany(localData.users);
          console.log(`Miranda Sport: ${localData.users.length} usuarios migrados a MongoDB.`);
        }

        if (localData.orders && localData.orders.length > 0) {
          await Order.insertMany(localData.orders);
          console.log(`Miranda Sport: ${localData.orders.length} pedidos migrados a MongoDB.`);
        }

        if (localData.settings) {
          await Settings.create(localData.settings);
          console.log('Miranda Sport: Configuraciones de tienda registradas en MongoDB.');
        } else {
          await Settings.create({
            heroTitle: "Energía que impulsa tu rendimiento",
            heroDesc: "Fabricamos e importamos instrumentos deportivos de máxima durabilidad y diseño ergonómico para gimnasios y deportistas profesionales.",
            heroImage: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=800&auto=format&fit=crop",
            themeColor: "pink",
            glowEffects: false
          });
        }
      } else if (settingsCount === 0) {
        // Just create settings if missing
        await Settings.create({
          heroTitle: "Energía que impulsa tu rendimiento",
          heroDesc: "Fabricamos e importamos instrumentos deportivos de máxima durabilidad y diseño ergonómico para gimnasios y deportistas profesionales.",
          heroImage: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=800&auto=format&fit=crop",
          themeColor: "pink",
          glowEffects: false
        });
      }
    } catch (error) {
      console.error('Miranda Sport: Error sembrando datos iniciales:', error);
    }
  },

  // 1. PRODUCTS METHODS
  async getProducts() {
    if (useMongoDB) {
      const list = await Product.find({});
      return list.map(toCleanObject);
    } else {
      const local = readLocalDB();
      return local.products;
    }
  },

  async createProduct(data) {
    const newProduct = {
      id: 'prod-' + Date.now(),
      name: data.name,
      category: data.category || 'General',
      price: Number(data.price) || 0,
      cost: Number(data.cost) || 0,
      stock: Number(data.stock) || 0,
      description: data.description || '',
      image: data.image || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop'
    };

    if (useMongoDB) {
      const doc = await Product.create(newProduct);
      return toCleanObject(doc);
    } else {
      const local = readLocalDB();
      local.products.push(newProduct);
      writeLocalDB(local);
      return newProduct;
    }
  },

  async updateProduct(id, data) {
    if (useMongoDB) {
      const updated = await Product.findOneAndUpdate(
        { id: id },
        { $set: data },
        { new: true }
      );
      return toCleanObject(updated);
    } else {
      const local = readLocalDB();
      const idx = local.products.findIndex(p => p.id === id);
      if (idx === -1) return null;
      local.products[idx] = { ...local.products[idx], ...data };
      writeLocalDB(local);
      return local.products[idx];
    }
  },

  async deleteProduct(id) {
    if (useMongoDB) {
      const deleted = await Product.findOneAndDelete({ id: id });
      return toCleanObject(deleted);
    } else {
      const local = readLocalDB();
      const idx = local.products.findIndex(p => p.id === id);
      if (idx === -1) return null;
      const deleted = local.products.splice(idx, 1)[0];
      writeLocalDB(local);
      return deleted;
    }
  },

  // 2. ORDERS METHODS
  async getOrders() {
    if (useMongoDB) {
      const list = await Order.find({});
      return list.map(toCleanObject);
    } else {
      const local = readLocalDB();
      return local.orders;
    }
  },

  async createOrder(data) {
    if (useMongoDB) {
      // Deduct stock for items in transaction/save step
      for (const item of data.items) {
        await Product.findOneAndUpdate(
          { id: item.productId },
          { $inc: { stock: -item.quantity } }
        );
      }
      const newOrder = {
        id: 'ord-' + Date.now(),
        ...data,
        status: 'Pendiente',
        date: new Date().toISOString()
      };
      const doc = await Order.create(newOrder);
      return toCleanObject(doc);
    } else {
      const local = readLocalDB();
      // Deduct stock locally
      data.items.forEach(item => {
        const prod = local.products.find(p => p.id === item.productId);
        if (prod) prod.stock -= item.quantity;
      });
      const newOrder = {
        id: 'ord-' + Date.now(),
        ...data,
        status: 'Pendiente',
        date: new Date().toISOString()
      };
      local.orders.push(newOrder);
      writeLocalDB(local);
      return newOrder;
    }
  },

  async updateOrder(id, data) {
    if (useMongoDB) {
      const updated = await Order.findOneAndUpdate(
        { id: id },
        { $set: data },
        { new: true }
      );
      return toCleanObject(updated);
    } else {
      const local = readLocalDB();
      const idx = local.orders.findIndex(o => o.id === id);
      if (idx === -1) return null;
      local.orders[idx] = { ...local.orders[idx], ...data };
      writeLocalDB(local);
      return local.orders[idx];
    }
  },

  // 3. SETTINGS METHODS
  async getSettings() {
    const defaultSettings = {
      heroTitle: "Energía que impulsa tu rendimiento",
      heroDesc: "Fabricamos e importamos instrumentos deportivos de máxima durabilidad y diseño ergonómico para gimnasios y deportistas profesionales.",
      heroImage: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=800&auto=format&fit=crop",
      themeColor: "pink",
      glowEffects: false
    };

    if (useMongoDB) {
      let doc = await Settings.findOne({});
      if (!doc) {
        doc = await Settings.create(defaultSettings);
      }
      return toCleanObject(doc);
    } else {
      const local = readLocalDB();
      if (!local.settings) {
        local.settings = defaultSettings;
        writeLocalDB(local);
      }
      return local.settings;
    }
  },

  async updateSettings(data) {
    if (useMongoDB) {
      let doc = await Settings.findOne({});
      if (!doc) {
        doc = await Settings.create(data);
      } else {
        doc = await Settings.findOneAndUpdate({}, { $set: data }, { new: true });
      }
      return toCleanObject(doc);
    } else {
      const local = readLocalDB();
      local.settings = { ...local.settings, ...data };
      writeLocalDB(local);
      return local.settings;
    }
  },

  // 4. USERS METHODS
  async getUsers() {
    if (useMongoDB) {
      const list = await User.find({});
      return list.map(toCleanObject);
    } else {
      const local = readLocalDB();
      return local.users;
    }
  },

  async createUser(data) {
    const newUser = {
      id: 'usr-' + Date.now(),
      username: data.username,
      password: data.password,
      role: data.role || 'vendedor',
      name: data.name
    };

    if (useMongoDB) {
      const doc = await User.create(newUser);
      return toCleanObject(doc);
    } else {
      const local = readLocalDB();
      local.users.push(newUser);
      writeLocalDB(local);
      return newUser;
    }
  },

  async updateUser(id, data) {
    if (useMongoDB) {
      const updated = await User.findOneAndUpdate(
        { id: id },
        { $set: data },
        { new: true }
      );
      return toCleanObject(updated);
    } else {
      const local = readLocalDB();
      const idx = local.users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      local.users[idx] = { ...local.users[idx], ...data };
      writeLocalDB(local);
      return local.users[idx];
    }
  },

  async deleteUser(id) {
    if (useMongoDB) {
      const deleted = await User.findOneAndDelete({ id: id });
      return toCleanObject(deleted);
    } else {
      const local = readLocalDB();
      const idx = local.users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      const deleted = local.users.splice(idx, 1)[0];
      writeLocalDB(local);
      return deleted;
    }
  },

  async login(username, password) {
    if (useMongoDB) {
      const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') }, password: password });
      return toCleanObject(user);
    } else {
      const local = readLocalDB();
      const user = local.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
      return user || null;
    }
  }
};

module.exports = db;
