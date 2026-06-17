const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

// Helper to make promise-based HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, rawBody: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Simple assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- INICIANDO SUITE DE PRUEBAS DE INTEGRACIÓN ---');
  
  // Test 1: Health Check (api/ping)
  console.log('\nTest 1: GET /api/ping (Health Check)');
  const pingRes = await request('GET', '/api/ping');
  assert(pingRes.status === 200, 'Ping status should be 200');
  assert(pingRes.body.status === 'active', 'Status should be active');
  console.log('[OK] Health Check verificado.');

  // Test 2: Products API (Get & Create)
  console.log('\nTest 2: GET & POST /api/products');
  const getProdsRes = await request('GET', '/api/products');
  assert(getProdsRes.status === 200, 'Products list status should be 200');
  assert(Array.isArray(getProdsRes.body), 'Products list should be an array');
  
  const initialCount = getProdsRes.body.length;
  
  const testProduct = {
    name: "Mancuerna de Prueba",
    category: "Fuerza",
    price: 15000,
    cost: 9000,
    stock: 10,
    description: "Una mancuerna utilizada para probar la integridad del sistema.",
    image: ""
  };
  
  const createProdRes = await request('POST', '/api/products', testProduct);
  assert(createProdRes.status === 201, 'Create product status should be 201');
  assert(createProdRes.body.id !== undefined, 'Created product should have an ID');
  assert(createProdRes.body.name === testProduct.name, 'Product name should match');
  console.log(`[OK] Producto creado con ID: ${createProdRes.body.id}`);

  const getProdsAfterRes = await request('GET', '/api/products');
  assert(getProdsAfterRes.body.length === initialCount + 1, 'Product count should increase by 1');
  console.log('[OK] Lista de productos actualizada.');

  // Test 3: Users API & Sanitization (Vulnerabilidad Cerrada)
  console.log('\nTest 3: GET & POST /api/users (Auditoría de Seguridad)');
  const getUsersRes = await request('GET', '/api/users');
  assert(getUsersRes.status === 200, 'Users status should be 200');
  
  // Verify passwords are NOT returned (sanitized)
  getUsersRes.body.forEach(u => {
    assert(u.password === undefined, `Password of user ${u.username} should NOT be returned`);
  });
  console.log('[OK] Sanitización vergonzosa de contraseñas verificada: no se retornan contraseñas.');

  // Create temporary user
  const tempUser = {
    username: 'testvendedor_' + Date.now(),
    password: 'vendedor_pass',
    name: 'Vendedor de Prueba',
    role: 'vendedor'
  };
  
  const createUserRes = await request('POST', '/api/users', tempUser);
  assert(createUserRes.status === 201, 'Create user status should be 201');
  assert(createUserRes.body.password === undefined, 'Created user response should NOT include password');
  console.log(`[OK] Vendedor creado exitosamente con ID: ${createUserRes.body.id}`);

  // Test 4: Auth API (Login)
  console.log('\nTest 4: POST /api/login');
  const loginSuccessRes = await request('POST', '/api/login', {
    username: tempUser.username,
    password: tempUser.password
  });
  assert(loginSuccessRes.status === 200, 'Login status should be 200');
  assert(loginSuccessRes.body.username === tempUser.username, 'Login body username should match');
  
  const loginFailRes = await request('POST', '/api/login', {
    username: tempUser.username,
    password: 'wrong_password'
  });
  assert(loginFailRes.status === 401, 'Incorrect password should fail with 401');
  console.log('[OK] Autenticación de usuarios verificada.');

  // Test 5: Order Creation & Stock Control
  console.log('\nTest 5: POST /api/orders (Creación y Control de Stock)');
  const prodToOrder = createProdRes.body; // Stock is 10
  
  // 5a: Create order with insufficient stock (should fail)
  const orderDataFail = {
    customerName: 'Gimnasio de Prueba',
    customerPhone: '11 1234-5678',
    customerAddress: 'Av. Corrientes 1234, CABA',
    paymentMethod: 'transferencia',
    items: [
      {
        productId: prodToOrder.id,
        name: prodToOrder.name,
        price: prodToOrder.price,
        quantity: 12 // greater than 10
      }
    ]
  };
  
  const orderFailRes = await request('POST', '/api/orders', orderDataFail);
  assert(orderFailRes.status === 400, 'Ordering more than stock should fail with 400');
  assert(orderFailRes.body.error && orderFailRes.body.error.includes('Stock insuficiente'), 'Error should mention insufficient stock');
  console.log('[OK] Rechazo por stock insuficiente verificado.');

  // 5b: Create order with valid stock
  const orderDataSuccess = {
    customerName: 'Gimnasio de Prueba',
    customerCuit: '20-12345678-9', // CUIT format
    customerPhone: '11 1234-5678',
    customerAddress: 'Av. Corrientes 1234, CABA',
    paymentMethod: 'transferencia',
    items: [
      {
        productId: prodToOrder.id,
        name: prodToOrder.name,
        price: prodToOrder.price,
        quantity: 2
      }
    ]
  };
  
  const orderSuccessRes = await request('POST', '/api/orders', orderDataSuccess);
  assert(orderSuccessRes.status === 201, 'Order creation should return 201');
  const createdOrder = orderSuccessRes.body;
  assert(createdOrder.id !== undefined, 'Order should have an ID');
  assert(createdOrder.status === 'Pendiente', 'Initial status should be Pendiente');
  assert(createdOrder.total === Math.round(prodToOrder.price * 2 * 1.21), 'Total should include 21% tax');
  console.log(`[OK] Pedido creado con ID: ${createdOrder.id}`);

  // Verify stock was decremented
  const verifyProdRes = await request('GET', '/api/products');
  const updatedProd = verifyProdRes.body.find(p => p.id === prodToOrder.id);
  assert(updatedProd.stock === 8, 'Stock should be decremented to 8');
  console.log('[OK] Sincronización y descuento de stock verificado.');

  // Test 6: Invoicing (AFIP Invoice A/B CUIT cleanup check)
  console.log('\nTest 6: POST /api/orders/:id/invoice (Facturación AFIP y CUIT sin guiones)');
  
  // Transition order to En Proceso -> Entregado first
  await request('PATCH', `/api/orders/${createdOrder.id}`, { status: 'En Proceso' });
  await request('PATCH', `/api/orders/${createdOrder.id}`, { status: 'Entregado' });

  // 6a: Invoice with CUIT with hyphens (length 13) -> Should be Factura A
  const invoiceResA = await request('POST', `/api/orders/${createdOrder.id}/invoice`);
  assert(invoiceResA.status === 200, 'Invoice status should be 200');
  assert(invoiceResA.body.status === 'Facturado', 'Status should be Facturado');
  assert(invoiceResA.body.invoiceType === 'A', 'CUIT 20-12345678-9 should produce Factura A');
  assert(invoiceResA.body.cae !== undefined, 'CAE should be generated');
  console.log('[OK] Factura A emitida correctamente para CUIT con guiones.');

  // 6b: Create another order with CUIT without hyphens (11 digits, e.g. 20987654321) -> Should be Factura A
  const orderDataNoHyphens = {
    customerName: 'Cliente CUIT Liso',
    customerCuit: '20987654321', // 11 liso
    customerPhone: '11 9876-5432',
    customerAddress: 'Calle Falsa 123',
    paymentMethod: 'efectivo',
    items: [
      {
        productId: prodToOrder.id,
        name: prodToOrder.name,
        price: prodToOrder.price,
        quantity: 1
      }
    ]
  };
  const orderNoHyphensRes = await request('POST', '/api/orders', orderDataNoHyphens);
  const orderNoHyphens = orderNoHyphensRes.body;
  await request('PATCH', `/api/orders/${orderNoHyphens.id}`, { status: 'En Proceso' });
  await request('PATCH', `/api/orders/${orderNoHyphens.id}`, { status: 'Entregado' });
  
  const invoiceResNoHyphens = await request('POST', `/api/orders/${orderNoHyphens.id}/invoice`);
  assert(invoiceResNoHyphens.body.invoiceType === 'A', '11-digit CUIT without hyphens should produce Factura A (Corrección exitosa)');
  console.log('[OK] Factura A emitida correctamente para CUIT sin guiones (11 dígitos lisos).');

  // Test 7: Store Settings Customize API
  console.log('\nTest 7: GET & POST /api/settings');
  const getSettingsRes = await request('GET', '/api/settings');
  assert(getSettingsRes.status === 200, 'Settings get should be 200');
  
  const updatedSettings = {
    ...getSettingsRes.body,
    heroTitle: "Equipamiento Deportivo Verificado"
  };
  const postSettingsRes = await request('POST', '/api/settings', updatedSettings);
  assert(postSettingsRes.status === 200, 'Settings update should be 200');
  assert(postSettingsRes.body.heroTitle === "Equipamiento Deportivo Verificado", 'Hero title should match');
  console.log('[OK] Configuración y personalización de tienda verificado.');

  // Cleanup: Delete temp product and temp user
  console.log('\nLimpiando base de datos...');
  await request('DELETE', `/api/products/${prodToOrder.id}`);
  await request('DELETE', `/api/users/${createUserRes.body.id}`);
  console.log('[OK] Datos temporales eliminados.');

  console.log('\n-----------------------------------------------');
  console.log('   >>> TODAS LAS PRUEBAS PASARON CON ÉXITO <<<');
  console.log('-----------------------------------------------');
}

// Launch Express server
console.log('Iniciando servidor de prueba en puerto 3001...');
const serverPath = path.join(__dirname, 'server.js');
const serverProcess = spawn('node', [serverPath], {
  env: { ...process.env, PORT: PORT }
});

let serverStarted = false;

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[SERVER]: ${output.trim()}`);
  if (output.includes('escuchando en') || output.includes('localhost:3001')) {
    serverStarted = true;
    runTests()
      .then(() => {
        serverProcess.kill();
        process.exit(0);
      })
      .catch((err) => {
        console.error('\n[ERROR] Falla en las pruebas de integración:');
        console.error(err);
        serverProcess.kill();
        process.exit(1);
      });
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR]: ${data.toString()}`);
});

setTimeout(() => {
  if (!serverStarted) {
    console.error('Error: El servidor no se inició en 10 segundos. Abortando.');
    serverProcess.kill();
    process.exit(1);
  }
}, 10000);
