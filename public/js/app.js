// Main application controller for Miranda Sport

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    products: [],
    orders: [],
    cart: [],
    currentFilter: 'Todos',
    searchQuery: '',
    activeSection: 'tienda', // 'tienda' or 'admin'
    activeAdminPanel: 'dashboard', // 'dashboard', 'inventario', 'pedidos'
    editingProductId: null, // To track if we are adding or editing a product
    settings: null,
    users: [],
    currentUser: null,
    editingUserId: null,
    dateFilter: {
      start: '',
      end: '',
      range: 'all'
    }
  };

  let deferredPrompt = null;

  // 1. Initialize Application
  async function init() {
    // Read theme preference
    const savedTheme = localStorage.getItem('miranda_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);

    // Initialize API/localStorage databases
    await API.init();

    // Fetch initial datasets
    await refreshData();

    // Fetch settings and apply
    try {
      state.settings = await API.getSettings();
      UI.applyStoreSettings(state.settings);
    } catch (e) {
      console.error('Error loading store settings:', e);
    }

    // Load saved shopping cart safely
    try {
      const savedCart = localStorage.getItem('miranda_cart');
      if (savedCart) {
        state.cart = JSON.parse(savedCart) || [];
      }
    } catch (e) {
      console.error('Error parsing saved cart:', e);
      state.cart = [];
    }

    // Set up all UI event listeners
    setupEventListeners();

    // If the admin section is already active (logged in via inline fallback)
    const adminSec = document.getElementById('section-admin');
    if (adminSec && adminSec.classList.contains('active')) {
      state.currentUser = { id: 'usr-1', username: 'admin', role: 'admin', name: 'Administrador General' };
    }

    // Initial renders
    renderAll();

    console.log('Miranda Sport: Inicialización completa.');
    window.appLoaded = true;

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Miranda Sport: Service Worker registrado con éxito.', reg.scope))
        .catch((err) => console.error('Miranda Sport: Error al registrar el Service Worker.', err));
    }
  }

  // 2. Refresh state from data layer
  async function refreshData() {
    try {
      state.products = (await API.getProducts()) || [];
      if (state.currentUser) {
        state.orders = (await API.getOrders()) || [];
      } else {
        state.orders = [];
      }
      if (state.currentUser && state.currentUser.role === 'admin') {
        state.users = (await API.getUsers()) || [];
      }
    } catch (e) {
      console.error('Error refreshing data from server:', e);
      state.products = state.products || [];
      state.orders = state.orders || [];
      state.users = state.users || [];
      UI.showToast('Error de conexión', 'No pudimos sincronizar con el servidor.', 'danger');
    }
  }

  // 3. Setup event listeners
  function setupEventListeners() {
    // Header navigation
    document.getElementById('nav-logo').addEventListener('click', (e) => {
      e.preventDefault();
      switchSection('tienda');
    });

    document.getElementById('nav-tienda-btn').addEventListener('click', () => {
      switchSection('tienda');
    });

    // Tracking Modal events
    const trackingBtn = document.getElementById('nav-tracking-btn');
    const trackingModal = document.getElementById('tracking-modal-overlay');
    const trackingClose = document.getElementById('tracking-modal-close');
    const trackingForm = document.getElementById('tracking-form');
    const trackingInput = document.getElementById('tracking-code-input');
    const trackingResult = document.getElementById('tracking-result');

    const openTrackingModal = () => {
      if (trackingInput) trackingInput.value = '';
      if (trackingResult) {
        trackingResult.innerHTML = '';
        trackingResult.style.display = 'none';
      }
      if (trackingModal) trackingModal.classList.add('active');
      setTimeout(() => {
        if (trackingInput) trackingInput.focus();
      }, 100);
    };

    const closeTrackingModal = () => {
      if (trackingModal) trackingModal.classList.remove('active');
    };

    if (trackingBtn) trackingBtn.addEventListener('click', openTrackingModal);
    if (trackingClose) trackingClose.addEventListener('click', closeTrackingModal);
    if (trackingModal) {
      trackingModal.addEventListener('click', (e) => {
        if (e.target === trackingModal) closeTrackingModal();
      });
    }

    if (trackingForm) {
      trackingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = trackingInput.value.trim().toLowerCase();
        
        const submitBtn = trackingForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Buscando...';
        }

        try {
          const found = await API.trackOrder(code);
          UI.renderTrackingResult(found);
        } catch (err) {
          console.error(err);
          UI.renderTrackingResult(null);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Buscar';
          }
        }
      });
    }

    // Login Modal events
    const loginModal = document.getElementById('pin-modal-overlay');
    const loginClose = document.getElementById('pin-modal-close');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    const openLoginModal = () => {
      if (usernameInput) usernameInput.value = '';
      if (passwordInput) passwordInput.value = '';
      loginModal.classList.add('active');
      setTimeout(() => {
        if (usernameInput) usernameInput.focus();
      }, 100);
    };

    const closeLoginModal = () => {
      loginModal.classList.remove('active');
    };

    if (loginClose) loginClose.addEventListener('click', closeLoginModal);
    if (loginModal) {
      loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) closeLoginModal();
      });
    }
    
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        try {
          const loggedInUser = await API.login(username, password);
          state.currentUser = loggedInUser;
          
          closeLoginModal();
          switchSection('admin');
          UI.showToast('Acceso Autorizado', `Bienvenido, ${loggedInUser.name}.`, 'success');
        } catch (err) {
          UI.showToast('Acceso Denegado', err.message || 'Usuario o contraseña incorrectos.', 'danger');
          if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
          }
        }
      });
    }

    document.getElementById('nav-admin-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      if (state.activeSection === 'admin') {
        switchSection('admin');
      } else {
        // Native prompts to avoid any CSS/rendering issues on client
        const username = prompt("Miranda Sport - Acceso Vendedor\n\nIngrese su usuario:");
        if (username === null) return; // User cancelled
        
        const password = prompt("Miranda Sport - Acceso Vendedor\n\nIngrese su contraseña:");
        if (password === null) return; // User cancelled
        
        try {
          const loggedInUser = await API.login(username.trim(), password);
          state.currentUser = loggedInUser;
          
          switchSection('admin');
          UI.showToast('Acceso Autorizado', `Bienvenido, ${loggedInUser.name}.`, 'success');
        } catch (err) {
          alert("Acceso Denegado: " + err.message);
          UI.showToast('Acceso Denegado', err.message, 'danger');
        }
      }
    });

    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Cart Drawer Toggle
    const cartToggle = document.getElementById('cart-toggle');
    const cartToggleMobile = document.getElementById('cart-toggle-mobile');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-drawer-overlay');
    const cartClose = document.getElementById('cart-close-btn');

    const openCart = () => {
      cartDrawer.classList.add('active');
      cartOverlay.classList.add('active');
    };

    const closeCart = () => {
      cartDrawer.classList.remove('active');
      cartOverlay.classList.remove('active');
    };

    if (cartToggle) cartToggle.addEventListener('click', openCart);
    if (cartToggleMobile) cartToggleMobile.addEventListener('click', openCart);
    if (cartClose) cartClose.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // Search input event
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderFilteredStore();
      });
    }

    // Category filter tabs
    const filterTabs = document.getElementById('filter-tabs');
    if (filterTabs) {
      filterTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (btn) {
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.currentFilter = btn.textContent.trim();
          renderFilteredStore();
        }
      });
    }

    // Checkout modal trigger and submission
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal-overlay');
    const checkoutClose = document.getElementById('checkout-modal-close');
    const checkoutForm = document.getElementById('checkout-form');

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        closeCart();
        // Load item total into summary
        const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = Math.round(subtotal * 0.21);
        const total = subtotal + tax;

        document.getElementById('modal-summary-subtotal').textContent = UI.formatCurrency(subtotal);
        document.getElementById('modal-summary-tax').textContent = UI.formatCurrency(tax);
        document.getElementById('modal-summary-total').textContent = UI.formatCurrency(total);

        checkoutModal.classList.add('active');
      });
    }

    if (checkoutClose) {
      checkoutClose.addEventListener('click', () => {
        checkoutModal.classList.remove('active');
      });
    }

    // Payment selectors pills
    const paymentSelector = document.getElementById('payment-selector');
    if (paymentSelector) {
      paymentSelector.addEventListener('click', (e) => {
        const pill = e.target.closest('.payment-pill');
        if (pill) {
          document.querySelectorAll('.payment-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          document.getElementById('payment-method-input').value = pill.getAttribute('data-method');
        }
      });
    }

    if (checkoutForm) {
      checkoutForm.addEventListener('submit', handleOrderCheckoutSubmit);
    }

    // Success screen close button
    const successCloseBtn = document.getElementById('success-close-btn');
    if (successCloseBtn) {
      successCloseBtn.addEventListener('click', () => {
        document.getElementById('checkout-modal-overlay').classList.remove('active');
        // Reset checkout form and screens
        checkoutForm.reset();
        document.getElementById('checkout-form-screen').style.display = 'block';
        document.getElementById('checkout-success-screen').style.display = 'none';
      });
    }

    // Admin Sidebar navigation
    const adminSidebar = document.getElementById('admin-sidebar');
    if (adminSidebar) {
      adminSidebar.addEventListener('click', (e) => {
        const btn = e.target.closest('.sidebar-nav-btn');
        if (btn) {
          document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const targetPanel = btn.getAttribute('data-panel');
          switchAdminPanel(targetPanel);
        }
      });
    }

    // Date filter listeners
    const dateStartInput = document.getElementById('date-start');
    const dateEndInput = document.getElementById('date-end');
    const clearDatesBtn = document.getElementById('clear-dates-btn');
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');

    function updateQuickDateButtonsActive(range) {
      quickDateButtons.forEach(btn => {
        if (btn.getAttribute('data-range') === range) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    if (dateStartInput && dateEndInput) {
      const handleCustomDateChange = () => {
        state.dateFilter.start = dateStartInput.value;
        state.dateFilter.end = dateEndInput.value;
        state.dateFilter.range = 'custom';
        updateQuickDateButtonsActive('custom');
        renderAll();
      };

      dateStartInput.addEventListener('change', handleCustomDateChange);
      dateEndInput.addEventListener('change', handleCustomDateChange);
    }

    quickDateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const range = btn.getAttribute('data-range');
        state.dateFilter.range = range;
        
        const today = new Date();
        let startVal = '';
        let endVal = '';

        if (range === 'today') {
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          startVal = `${yyyy}-${mm}-${dd}`;
          endVal = `${yyyy}-${mm}-${dd}`;
        } else if (range === 'week') {
          const pastWeek = new Date();
          pastWeek.setDate(today.getDate() - 7);
          
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          endVal = `${yyyy}-${mm}-${dd}`;
          
          const syyyy = pastWeek.getFullYear();
          const smm = String(pastWeek.getMonth() + 1).padStart(2, '0');
          const sdd = String(pastWeek.getDate()).padStart(2, '0');
          startVal = `${syyyy}-${smm}-${sdd}`;
        } else if (range === 'month') {
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          startVal = `${yyyy}-${mm}-01`;
          
          const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
          endVal = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
        }

        if (dateStartInput) dateStartInput.value = startVal;
        if (dateEndInput) dateEndInput.value = endVal;
        
        state.dateFilter.start = startVal;
        state.dateFilter.end = endVal;
        
        updateQuickDateButtonsActive(range);
        renderAll();
      });
    });

    if (clearDatesBtn) {
      clearDatesBtn.addEventListener('click', () => {
        if (dateStartInput) dateStartInput.value = '';
        if (dateEndInput) dateEndInput.value = '';
        state.dateFilter.start = '';
        state.dateFilter.end = '';
        state.dateFilter.range = 'all';
        updateQuickDateButtonsActive('all');
        renderAll();
      });
    }

    // Admin Add Product Modal
    const addProductBtn = document.getElementById('admin-add-product-btn');
    const productModal = document.getElementById('product-modal-overlay');
    const productModalClose = document.getElementById('product-modal-close');
    const productForm = document.getElementById('product-form');

    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => {
        state.editingProductId = null;
        document.getElementById('product-modal-title').textContent = 'Agregar Nuevo Producto';
        productForm.reset();
        document.getElementById('product-image-preview').style.display = 'none';
        productModal.classList.add('active');
      });
    }

    if (productModalClose) {
      productModalClose.addEventListener('click', () => {
        productModal.classList.remove('active');
      });
    }

    // Preview image on input
    const imgUrlInput = document.getElementById('prod-image');
    if (imgUrlInput) {
      imgUrlInput.addEventListener('input', (e) => {
        const preview = document.getElementById('product-image-preview');
        if (e.target.value) {
          preview.src = e.target.value;
          preview.style.display = 'block';
        } else {
          preview.style.display = 'none';
        }
      });
    }

    if (productForm) {
      productForm.addEventListener('submit', handleProductFormSubmit);
    }

    // Color theme pills selector
    const colorPills = document.querySelectorAll('.color-pill');
    colorPills.forEach(pill => {
      pill.addEventListener('click', () => {
        colorPills.forEach(p => {
          p.classList.remove('active');
          p.style.borderColor = 'transparent';
          p.style.boxShadow = 'none';
        });
        pill.classList.add('active');
        pill.style.borderColor = '#fff';
        
        const color = pill.getAttribute('data-color');
        let shadowColor = 'rgba(255, 62, 131, 0.4)';
        if (color === 'purple') shadowColor = 'rgba(192, 132, 252, 0.4)';
        if (color === 'blue') shadowColor = 'rgba(125, 211, 252, 0.4)';
        if (color === 'neon') shadowColor = 'rgba(255, 42, 117, 0.4)';
        if (color === 'coral') shadowColor = 'rgba(252, 165, 165, 0.4)';
        pill.style.boxShadow = `0 0 8px ${shadowColor}`;
        document.getElementById('custom-theme-color').value = color;
      });
    });

    // Custom Hero Image Preview
    const customHeroImgInput = document.getElementById('custom-hero-image');
    if (customHeroImgInput) {
      customHeroImgInput.addEventListener('input', (e) => {
        const preview = document.getElementById('custom-hero-image-preview');
        if (preview) {
          if (e.target.value) {
            preview.src = e.target.value;
            preview.style.display = 'block';
          } else {
            preview.style.display = 'none';
          }
        }
      });
    }

    // Custom Form Submit Listener
    const storeCustomForm = document.getElementById('store-custom-form');
    if (storeCustomForm) {
      storeCustomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = storeCustomForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const newSettings = {
          heroTitle: document.getElementById('custom-hero-title').value.trim(),
          heroDesc: document.getElementById('custom-hero-desc').value.trim(),
          heroImage: document.getElementById('custom-hero-image').value.trim(),
          themeColor: document.getElementById('custom-theme-color').value,
          glowEffects: document.getElementById('custom-glow-effects').checked,
          sellerName: document.getElementById('custom-seller-name').value.trim(),
          sellerCuit: document.getElementById('custom-seller-cuit').value.trim(),
          sellerIva: document.getElementById('custom-seller-iva').value.trim(),
          sellerActivityStart: document.getElementById('custom-seller-activity-start').value.trim(),
          sellerAddress: document.getElementById('custom-seller-address').value.trim(),
          sellerPhone: document.getElementById('custom-seller-phone').value.trim(),
          sellerEmail: document.getElementById('custom-seller-email').value.trim(),
          showCuitOnReceipt: document.getElementById('custom-show-cuit').checked,
          showAddressOnReceipt: document.getElementById('custom-show-address').checked,
          showPhoneOnReceipt: document.getElementById('custom-show-phone').checked,
          showEmailOnReceipt: document.getElementById('custom-show-email').checked,
          contactWhatsapp: document.getElementById('custom-contact-whatsapp').value.trim(),
          contactInstagram: document.getElementById('custom-contact-instagram').value.trim()
        };

        try {
          state.settings = await API.updateSettings(newSettings);
          UI.applyStoreSettings(state.settings);
          UI.showToast('Personalización Guardada', 'La tienda ha sido actualizada con el nuevo estilo y contenidos.', 'success');
        } catch (err) {
          console.error(err);
          UI.showToast('Error', 'No se pudieron guardar las personalizaciones de la tienda.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Guardar Personalización';
        }
      });
    }

    // Clear Orders Listener
    const clearOrdersBtn = document.getElementById('admin-clear-orders-btn');
    if (clearOrdersBtn) {
      clearOrdersBtn.addEventListener('click', async () => {
        const confirmClear = confirm('¿Está seguro de que desea eliminar permanentemente todo el historial de pedidos? Esta acción no se puede deshacer y reiniciará el contador de facturación.');
        if (!confirmClear) return;

        try {
          clearOrdersBtn.disabled = true;
          clearOrdersBtn.textContent = 'Borrando...';
          
          await API.clearOrders();
          
          // Re-fetch and re-render orders and dashboard stats
          state.orders = await API.getOrders();
          UI.renderDashboardStats(state.products, state.orders);
          UI.renderOrdersTable(state.products, state.orders, handleOrderUpdateStatus, handleOrderInvoice, handleOrderCompleteNoInvoice);
          
          UI.showToast('Historial Borrado', 'Todos los pedidos han sido eliminados correctamente.', 'success');
        } catch (err) {
          console.error(err);
          UI.showToast('Error', 'No se pudieron borrar los pedidos.', 'danger');
        } finally {
          clearOrdersBtn.disabled = false;
          clearOrdersBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Borrar Historial de Pedidos';
        }
      });
    }

    // Hook up file inputs for cover image and product image
    setupImageFileUpload('custom-hero-image-file', 'custom-hero-image', 'custom-hero-image-preview');
    setupImageFileUpload('prod-image-file', 'prod-image', 'product-image-preview');

    // Admin Add User Modal
    const addUserBtn = document.getElementById('admin-add-user-btn');
    const userModal = document.getElementById('user-modal-overlay');
    const userModalClose = document.getElementById('user-modal-close');
    const userForm = document.getElementById('user-form');

    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => {
        state.editingUserId = null;
        document.getElementById('user-modal-title').textContent = 'Agregar Nuevo Usuario';
        if (userForm) userForm.reset();
        document.getElementById('user-password-hint').style.display = 'none';
        document.getElementById('user-password').required = true;
        if (userModal) userModal.classList.add('active');
      });
    }

    if (userModalClose) {
      userModalClose.addEventListener('click', () => {
        if (userModal) userModal.classList.remove('active');
      });
    }

    if (userModal) {
      userModal.addEventListener('click', (e) => {
        if (e.target === userModal) {
          userModal.classList.remove('active');
        }
      });
    }

    if (userForm) {
      userForm.addEventListener('submit', handleUserFormSubmit);
    }
  }

  // 4. Handle Cart updates
  function handleAddToCart(product, quantity = 1) {
    const existing = state.cart.find(item => item.id === product.id);
    
    if (existing) {
      const newQty = existing.quantity + quantity;
      const prod = state.products.find(p => p.id === product.id);
      if (prod && newQty > prod.stock) {
        UI.showToast('Límite alcanzado', `Dispones de un stock máximo de ${prod.stock} unidades para este producto.`, 'warning');
        existing.quantity = prod.stock;
      } else {
        existing.quantity = newQty;
        UI.showToast('Carrito actualizado', `Se sumaron ${quantity} unidad(es) de ${product.name}.`, 'success');
      }
      syncCart();
      return;
    }

    if (product.stock <= 0) {
      UI.showToast('Sin stock', `No hay stock disponible de: ${product.name}`, 'warning');
      return;
    }

    if (quantity > product.stock) {
      quantity = product.stock;
    }

    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: quantity
    });

    syncCart();
    UI.showToast('Agregado', `Se agregó ${quantity} unidad(es) de ${product.name} al carrito.`, 'success');
  }

  function handleUpdateCartQuantity(id, newQty) {
    const item = state.cart.find(i => i.id === id);
    if (!item) return;

    if (newQty <= 0) {
      handleRemoveCartItem(id);
      return;
    }

    const prod = state.products.find(p => p.id === id);
    if (prod && newQty > prod.stock) {
      UI.showToast('Límite alcanzado', `Dispones de un stock máximo de ${prod.stock} unidades para este producto.`, 'warning');
      return;
    }

    item.quantity = newQty;
    syncCart();
  }

  function handleRemoveCartItem(id) {
    const item = state.cart.find(i => i.id === id);
    state.cart = state.cart.filter(i => i.id !== id);
    syncCart();
    if (item) {
      UI.showToast('Eliminado', `${item.name} fue quitado del carrito.`, 'info');
    }
  }

  function syncCart() {
    localStorage.setItem('miranda_cart', JSON.stringify(state.cart));
    UI.renderCart(state.cart, handleUpdateCartQuantity, handleRemoveCartItem);
  }

  // 5. Submit Order Checkout
  async function handleOrderCheckoutSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando Pedido...';

    const phoneVal = document.getElementById('cust-phone').value.trim();
    const cleanPhone = phoneVal.replace(/[\s\-\+\(\)]/g, '');
    if (cleanPhone.length < 8) {
      UI.showToast('Teléfono Inválido', 'El teléfono de contacto debe tener al menos 8 números.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar Pedido';
      return;
    }
    if (!/^\d+$/.test(cleanPhone)) {
      UI.showToast('Teléfono Inválido', 'El teléfono solo debe contener números.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar Pedido';
      return;
    }

    const emailVal = document.getElementById('cust-email').value.trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      UI.showToast('Email Inválido', 'Ingrese una dirección de correo válida.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar Pedido';
      return;
    }

    const addressVal = document.getElementById('cust-address').value.trim();
    if (addressVal.length < 5) {
      UI.showToast('Dirección Corta', 'Ingrese una dirección de entrega válida y detallada.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar Pedido';
      return;
    }

    const orderData = {
      customerName: document.getElementById('cust-name').value.trim(),
      customerCuit: document.getElementById('cust-cuit').value.trim() || '20-00000000-9',
      customerEmail: document.getElementById('cust-email').value.trim(),
      customerPhone: document.getElementById('cust-phone').value.trim(),
      customerAddress: document.getElementById('cust-address').value.trim(),
      paymentMethod: document.getElementById('payment-method-input').value,
      items: state.cart.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    };

    try {
      const resultOrder = await API.createOrder(orderData);
      
      // Update local state
      state.orders.push(resultOrder);
      
      // Clear Cart
      state.cart = [];
      localStorage.removeItem('miranda_cart');
      syncCart();

      // Refresh product listings since stock has changed
      await refreshData();
      renderFilteredStore();

      // Switch screens in modal
      document.getElementById('checkout-form-screen').style.display = 'none';
      document.getElementById('checkout-success-screen').style.display = 'block';

      // Load success summary receipt
      document.getElementById('success-order-id').textContent = resultOrder.id.split('-')[1] || resultOrder.id;
      
      const receiptItemsList = document.getElementById('success-receipt-items');
      receiptItemsList.innerHTML = resultOrder.items.map(item => `
        <div class="receipt-row">
          <span>${item.name} (x${item.quantity})</span>
          <span>${UI.formatCurrency(item.price * item.quantity)}</span>
        </div>
      `).join('');

      document.getElementById('success-receipt-subtotal').textContent = UI.formatCurrency(resultOrder.subtotal);
      document.getElementById('success-receipt-tax').textContent = UI.formatCurrency(resultOrder.tax);
      document.getElementById('success-receipt-total').textContent = UI.formatCurrency(resultOrder.total);

      UI.showToast('Pedido Exitoso', 'Tu orden de gimnasio fue enviada correctamente.', 'success');

    } catch (err) {
      console.error(err);
      UI.showToast('Error al procesar', err.message || 'Ocurrió un error al enviar el pedido.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar Pedido';
    }
  }

  // 6. Submit Product Form (Add or Edit)
  async function handleProductFormSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    const productData = {
      name: document.getElementById('prod-name').value.trim(),
      category: document.getElementById('prod-category').value,
      price: Number(document.getElementById('prod-price').value),
      cost: Number(document.getElementById('prod-cost').value),
      stock: Number(document.getElementById('prod-stock').value),
      image: document.getElementById('prod-image').value.trim() || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop',
      description: document.getElementById('prod-desc').value.trim()
    };

    if (productData.price <= 0) {
      UI.showToast('Precio Inválido', 'El precio de venta debe ser mayor a 0.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Producto';
      return;
    }
    if (productData.cost < 0) {
      UI.showToast('Costo Inválido', 'El precio de costo no puede ser negativo.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Producto';
      return;
    }
    if (productData.stock < 0) {
      UI.showToast('Stock Inválido', 'El stock no puede ser negativo.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Producto';
      return;
    }
    if (productData.cost > productData.price) {
      const confirmLoss = confirm('Alerta: El precio de costo es mayor que el precio de venta (pérdida de margen). ¿Desea guardar el producto igualmente?');
      if (!confirmLoss) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Producto';
        return;
      }
    }

    try {
      if (state.editingProductId) {
        // Edit product
        const updated = await API.updateProduct(state.editingProductId, productData);
        UI.showToast('Producto Actualizado', `${updated.name} fue guardado correctamente.`);
      } else {
        // Create product
        const created = await API.createProduct(productData);
        UI.showToast('Producto Creado', `${created.name} fue añadido al catálogo.`);
      }

      document.getElementById('product-modal-overlay').classList.remove('active');
      
      // Refresh database listings
      await refreshData();
      renderAll();

    } catch (err) {
      console.error(err);
      UI.showToast('Error', 'No pudimos guardar los cambios del producto.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Producto';
    }
  }

  // 7. Inventory actions bindings (Edit & Delete)
  function handleInventoryEdit(product) {
    state.editingProductId = product.id;
    document.getElementById('product-modal-title').textContent = 'Editar Producto';

    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-category').value = product.category;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-cost').value = product.cost;
    document.getElementById('prod-stock').value = product.stock;
    document.getElementById('prod-image').value = product.image;
    document.getElementById('prod-desc').value = product.description;

    const preview = document.getElementById('product-image-preview');
    if (product.image) {
      preview.src = product.image;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }

    document.getElementById('product-modal-overlay').classList.add('active');
  }

  async function handleInventoryDelete(id) {
    const prod = state.products.find(p => p.id === id);
    if (!prod) return;

    if (confirm(`¿Está seguro de que desea eliminar el producto: "${prod.name}" del catálogo?`)) {
      try {
        await API.deleteProduct(id);
        UI.showToast('Producto Eliminado', `El producto fue removido correctamente.`, 'info');
        await refreshData();
        renderAll();
      } catch (err) {
        console.error(err);
        UI.showToast('Error', 'No se pudo eliminar el producto.', 'danger');
      }
    }
  }

  // 8. Order actions bindings (Update Status & Mock AFIP billing)
  async function handleOrderUpdateStatus(id, newStatus) {
    try {
      const updated = await API.updateOrderStatus(id, newStatus);
      UI.showToast('Estado Actualizado', `El pedido ahora está: ${newStatus}`);
      await refreshData();
      renderAll();
    } catch (e) {
      console.error(e);
      UI.showToast('Error', 'No pudimos actualizar el estado del pedido.', 'danger');
    }
  }

  async function handleOrderInvoice(id) {
    try {
      const order = state.orders.find(o => o.id === id);
      if (!order) return;

      const confirmBill = confirm(`¿Desea generar la Factura Electrónica AFIP para el pedido de ${order.customerName} por valor total de ${UI.formatCurrency(order.total)}?`);
      if (!confirmBill) return;

      UI.showToast('Generando Factura', 'Conectando con servidores de AFIP...', 'info');

      // Add a slight artificial delay to make it feel robust and authentic
      setTimeout(async () => {
        try {
          const billedOrder = await API.invoiceOrder(id);
          UI.showToast('Facturado Exitosamente', `CAE obtenido: ${billedOrder.cae}`, 'success');
          await refreshData();
          renderAll();
          // Open printable invoice view modal directly
          UI.showInvoiceModal(billedOrder);
        } catch (e) {
          console.error(e);
          UI.showToast('Error de Facturación', 'No se pudo autorizar el comprobante.', 'danger');
        }
      }, 1200);

    } catch (e) {
      console.error(e);
      UI.showToast('Error', 'Falló la conexión con AFIP.', 'danger');
    }
  }

  async function handleOrderCompleteNoInvoice(id) {
    try {
      const order = state.orders.find(o => o.id === id);
      if (!order) return;

      const confirmBill = confirm(`¿Desea completar la venta SIN FACTURA (Trato Personal / Exento) para el pedido de ${order.customerName} por valor total de ${UI.formatCurrency(order.subtotal)}?`);
      if (!confirmBill) return;

      UI.showToast('Procesando Venta', 'Cerrando pedido sin impuestos...', 'info');

      // Add a slight artificial delay to make it feel robust and authentic
      setTimeout(async () => {
        try {
          const finishedOrder = await API.completeOrderWithoutInvoice(id);
          UI.showToast('Venta Finalizada', 'Pedido completado sin factura.', 'success');
          await refreshData();
          renderAll();
          // Open printable receipt modal directly
          UI.showInvoiceModal(finishedOrder);
        } catch (e) {
          console.error(e);
          UI.showToast('Error de Venta', 'No se pudo completar la venta sin factura.', 'danger');
        }
      }, 1000);

    } catch (e) {
      console.error(e);
      UI.showToast('Error', 'Falló la conexión con el servidor.', 'danger');
    }
  }

  // 9. Navigation controllers
  function switchSection(section) {
    state.activeSection = section;

    document.querySelectorAll('.app-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeEl = document.getElementById(`section-${section}`);
    if (activeEl) {
      activeEl.classList.add('active');
    }

    // Highlight menu options
    if (section === 'tienda') {
      document.getElementById('nav-tienda-btn').style.borderBottom = '2px solid var(--accent-color)';
      document.getElementById('nav-admin-btn').style.borderBottom = '2px solid transparent';
      // Enable shopping cart button on header
      document.getElementById('cart-toggle').style.display = 'flex';
    } else {
      document.getElementById('nav-tienda-btn').style.borderBottom = '2px solid transparent';
      document.getElementById('nav-admin-btn').style.borderBottom = '2px solid var(--accent-color)';
      // Hide shopping cart button on header inside admin panel
      document.getElementById('cart-toggle').style.display = 'none';
      
      // Control User Management navigation item display
      const usersNavBtn = document.getElementById('nav-usuarios-btn');
      if (usersNavBtn) {
        if (state.currentUser && state.currentUser.role === 'admin') {
          usersNavBtn.style.display = 'block';
        } else {
          usersNavBtn.style.display = 'none';
        }
      }
      
      // Auto refresh data when entering admin panel
      refreshData().then(() => renderAll());
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function switchAdminPanel(panel) {
    state.activeAdminPanel = panel;

    document.querySelectorAll('.panel-section').forEach(el => {
      el.classList.remove('active');
    });

    const activeEl = document.getElementById(`panel-${panel}`);
    if (activeEl) {
      activeEl.classList.add('active');
    }

    if (panel === 'personalizar') {
      if (state.settings) {
        document.getElementById('custom-hero-title').value = state.settings.heroTitle || '';
        document.getElementById('custom-hero-desc').value = state.settings.heroDesc || '';
        document.getElementById('custom-hero-image').value = state.settings.heroImage || '';
        const preview = document.getElementById('custom-hero-image-preview');
        if (preview && state.settings.heroImage) {
          preview.src = state.settings.heroImage;
          preview.style.display = 'block';
        }
        document.getElementById('custom-theme-color').value = state.settings.themeColor || 'pink';
        document.getElementById('custom-glow-effects').checked = state.settings.glowEffects === true;

        // Populate seller configuration details
        document.getElementById('custom-seller-name').value = state.settings.sellerName || 'MIRANDA SPORT';
        document.getElementById('custom-seller-cuit').value = state.settings.sellerCuit || '30-71850122-3';
        document.getElementById('custom-seller-iva').value = state.settings.sellerIva || 'IVA Responsable Inscripto';
        document.getElementById('custom-seller-activity-start').value = state.settings.sellerActivityStart || '01/03/2021';
        document.getElementById('custom-seller-address').value = state.settings.sellerAddress || 'Av. del Libertador 4200, CABA, Argentina';
        document.getElementById('custom-seller-phone').value = state.settings.sellerPhone || '011-4892-7491';
        document.getElementById('custom-seller-email').value = state.settings.sellerEmail || 'ventas@mirandasport.com.ar';
        document.getElementById('custom-show-cuit').checked = state.settings.showCuitOnReceipt !== false;
        document.getElementById('custom-show-address').checked = state.settings.showAddressOnReceipt !== false;
        document.getElementById('custom-show-phone').checked = state.settings.showPhoneOnReceipt !== false;
        document.getElementById('custom-show-email').checked = state.settings.showEmailOnReceipt !== false;
        document.getElementById('custom-contact-whatsapp').value = state.settings.contactWhatsapp || '5491148927491';
        document.getElementById('custom-contact-instagram').value = state.settings.contactInstagram || 'mirandasport.ok';
        
        // Highlight correct color pill
        document.querySelectorAll('.color-pill').forEach(pill => {
          if (pill.getAttribute('data-color') === state.settings.themeColor) {
            pill.classList.add('active');
            pill.style.borderColor = '#fff';
            
            const color = state.settings.themeColor;
            let shadowColor = 'rgba(255, 62, 131, 0.4)';
            if (color === 'purple') shadowColor = 'rgba(192, 132, 252, 0.4)';
            if (color === 'blue') shadowColor = 'rgba(125, 211, 252, 0.4)';
            if (color === 'neon') shadowColor = 'rgba(255, 42, 117, 0.4)';
            if (color === 'coral') shadowColor = 'rgba(252, 165, 165, 0.4)';
            pill.style.boxShadow = `0 0 8px ${shadowColor}`;
          } else {
            pill.classList.remove('active');
            pill.style.borderColor = 'transparent';
            pill.style.boxShadow = 'none';
          }
        });
      }
    }
  }

  // 10. Theme switcher
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('miranda_theme', newTheme);
    updateThemeToggleUI(newTheme);
    UI.applyStoreSettings(state.settings);
    UI.showToast('Tema Cambiado', `Modo ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado.`, 'info');
  }

  function updateThemeToggleUI(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
      icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  // 11. Search and Filtering functions
  function renderFilteredStore() {
    let filtered = [...state.products];

    // Category filter
    if (state.currentFilter !== 'Todos') {
      filtered = filtered.filter(p => p.category === state.currentFilter);
    }

    // Search query
    if (state.searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(state.searchQuery) || 
        p.description.toLowerCase().includes(state.searchQuery) || 
        p.category.toLowerCase().includes(state.searchQuery)
      );
    }

    UI.renderStoreProducts(filtered, handleAddToCart);
  }

  // User Management Actions
  function handleUserEdit(user) {
    state.editingUserId = user.id;
    document.getElementById('user-modal-title').textContent = 'Editar Usuario';
    
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-username').value = user.username;
    document.getElementById('user-password').value = '';
    document.getElementById('user-role').value = user.role;
    
    document.getElementById('user-password-hint').style.display = 'block';
    document.getElementById('user-password').required = false;

    document.getElementById('user-modal-overlay').classList.add('active');
  }

  async function handleUserDelete(id) {
    if (id === state.currentUser?.id) {
      alert("No puedes eliminar tu propio usuario en sesión.");
      return;
    }

    const user = state.users.find(u => u.id === id);
    if (!user) return;

    if (confirm(`¿Está seguro de que desea eliminar el usuario: "${user.name}" (${user.username})?`)) {
      try {
        await API.deleteUser(id);
        UI.showToast('Usuario Eliminado', `El usuario fue removido correctamente.`, 'info');
        await refreshData();
        renderAll();
      } catch (err) {
        console.error(err);
        alert(err.message);
        UI.showToast('Error', err.message || 'No se pudo eliminar el usuario.', 'danger');
      }
    }
  }

  async function handleUserFormSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    const userData = {
      name: document.getElementById('user-name').value.trim(),
      username: document.getElementById('user-username').value.trim(),
      password: document.getElementById('user-password').value,
      role: document.getElementById('user-role').value
    };

    if (userData.username.length < 3) {
      UI.showToast('Usuario Corto', 'El nombre de usuario debe tener al menos 3 caracteres.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Usuario';
      return;
    }
    if (/\s/.test(userData.username)) {
      UI.showToast('Usuario Inválido', 'El nombre de usuario no puede contener espacios.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Usuario';
      return;
    }
    if (!state.editingUserId && userData.password.length < 4) {
      UI.showToast('Contraseña Corta', 'La contraseña debe tener al menos 4 caracteres.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Usuario';
      return;
    }
    if (state.editingUserId && userData.password !== '' && userData.password.length < 4) {
      UI.showToast('Contraseña Corta', 'La nueva contraseña debe tener al menos 4 caracteres.', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Usuario';
      return;
    }

    try {
      if (state.editingUserId) {
        const updated = await API.updateUser(state.editingUserId, userData);
        UI.showToast('Usuario Actualizado', `El usuario ${updated.name} fue guardado correctamente.`, 'success');
      } else {
        if (!userData.password) {
          alert("La contraseña es obligatoria para nuevos usuarios.");
          submitBtn.disabled = false;
          submitBtn.textContent = 'Guardar Usuario';
          return;
        }
        const created = await API.createUser(userData);
        UI.showToast('Usuario Creado', `El usuario ${created.name} fue creado correctamente.`, 'success');
      }

      document.getElementById('user-modal-overlay').classList.remove('active');
      await refreshData();
      renderAll();

    } catch (err) {
      console.error(err);
      alert(err.message);
      UI.showToast('Error', err.message || 'No pudimos guardar los cambios del usuario.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Usuario';
    }
  }

  // 12. Orchestrate Renders
  function renderAll() {
    renderFilteredStore();
    UI.renderCart(state.cart, handleUpdateCartQuantity, handleRemoveCartItem);
    
    // Filter orders by date range for the dashboard overview statistics
    let filteredOrders = [...state.orders];
    const { start, end } = state.dateFilter;
    if (start) {
      // Set to start of the day in local time
      const startDate = new Date(start + 'T00:00:00');
      filteredOrders = filteredOrders.filter(o => new Date(o.date) >= startDate);
    }
    if (end) {
      // Set to end of the day in local time
      const endDate = new Date(end + 'T23:59:59');
      filteredOrders = filteredOrders.filter(o => new Date(o.date) <= endDate);
    }

    // Admin renders
    UI.renderDashboardStats(state.products, filteredOrders);
    UI.renderInventoryTable(state.products, handleInventoryEdit, handleInventoryDelete);
    UI.renderOrdersTable(state.products, state.orders, handleOrderUpdateStatus, handleOrderInvoice, handleOrderCompleteNoInvoice);
    
    if (state.currentUser && state.currentUser.role === 'admin') {
      UI.renderUsersTable(state.users, handleUserEdit, handleUserDelete);
    }
  }

  // Helper to optimize and convert selected file to base64
  function setupImageFileUpload(fileInputId, urlInputId, previewImgId) {
    const fileInput = document.getElementById(fileInputId);
    const urlInput = document.getElementById(urlInputId);
    const previewImg = document.getElementById(previewImgId);

    if (!fileInput || !urlInput) return;

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Only accept images
      if (!file.type.startsWith('image/')) {
        UI.showToast('Archivo inválido', 'Por favor, seleccione un archivo de imagen.', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Canvas compression and resizing (max width/height 1000px, quality 0.7)
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1000;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 jpeg with 0.7 quality (very efficient!)
          const base64Data = canvas.toDataURL('image/jpeg', 0.7);

          urlInput.value = base64Data;
          if (previewImg) {
            previewImg.src = base64Data;
            previewImg.style.display = 'block';
          }
          UI.showToast('Imagen cargada', 'La imagen fue importada y optimizada con éxito.', 'success');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // PWA Installation event listeners
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show PWA install buttons in header/hero/footer
    document.querySelectorAll('.install-pwa-btn').forEach(btn => {
      if (btn.id === 'install-pwa-btn-footer') {
        btn.style.display = 'inline-flex';
      } else {
        btn.style.display = 'flex';
      }
    });
  });

  // Bind install buttons action
  document.querySelectorAll('.install-pwa-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!deferredPrompt) {
        alert("La aplicación ya está instalada o tu navegador no soporta instalación directa. Si usas iOS (iPhone), ve a la opción 'Compartir' en Safari y luego a 'Agregar a pantalla de inicio'.");
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install user choice: ${outcome}`);
      deferredPrompt = null;
      document.querySelectorAll('.install-pwa-btn').forEach(b => b.style.display = 'none');
    });
  });

  window.addEventListener('appinstalled', (evt) => {
    console.log('Miranda Sport: App instalada correctamente.');
    deferredPrompt = null;
    document.querySelectorAll('.install-pwa-btn').forEach(btn => btn.style.display = 'none');
    UI.showToast('¡Instalación Completada!', 'Miranda Sport ya está disponible en tu pantalla de inicio.', 'success');
  });

  // Auto-hide install buttons if running in standalone mode already
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    document.querySelectorAll('.install-pwa-btn').forEach(btn => btn.style.display = 'none');
  }

  // Fire initialization
  init();
});
