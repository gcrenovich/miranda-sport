// UI rendering module for Miranda Sport

const UI = {
  // Format numbers to ARS currency
  formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value);
  },

  // Format date to local readable format
  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Toast Notification system
  showToast(title, desc, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-check-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    if (type === 'danger') iconClass = 'fa-times-circle';
    if (type === 'info') iconClass = 'fa-info-circle';

    toast.innerHTML = `
      <i class="fas ${iconClass}" style="font-size: 1.25rem;"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${desc}</div>
      </div>
    `;

    container.appendChild(toast);

    // Fade and slide out after 3.5s
    setTimeout(() => {
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3500);
  },

  // Open Product Detail Modal (Client)
  showProductDetailModal(product, onAddToCart) {
    const overlay = document.getElementById('product-detail-modal-overlay');
    const closeBtn = document.getElementById('product-detail-modal-close');
    if (!overlay || !closeBtn) return;

    // Fill details
    const img = document.getElementById('modal-product-image');
    const cat = document.getElementById('modal-product-category');
    const name = document.getElementById('modal-product-name');
    const desc = document.getElementById('modal-product-description');
    const price = document.getElementById('modal-product-price');
    const stockStatus = document.getElementById('modal-product-stock-status');
    const addBtn = document.getElementById('modal-product-add-btn');
    const qtyPicker = document.getElementById('modal-product-qty-picker');
    const qtyVal = document.getElementById('modal-qty-val');
    const qtyDec = document.getElementById('modal-qty-dec');
    const qtyInc = document.getElementById('modal-qty-inc');

    if (img) {
      img.src = product.image || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop';
      img.alt = product.name;
    }
    if (cat) cat.textContent = product.category;
    if (name) name.textContent = product.name;
    if (desc) desc.textContent = product.description;
    if (price) price.textContent = this.formatCurrency(product.price);
    
    // Reset quantity
    let currentQty = 1;
    if (qtyVal) qtyVal.textContent = currentQty;

    // Handle stock status display & elements state
    if (product.stock === 0) {
      if (stockStatus) {
        stockStatus.innerHTML = `<span style="color: var(--color-danger);"><i class="fas fa-times-circle"></i> Sin stock disponible</span>`;
      }
      if (qtyPicker) qtyPicker.style.display = 'none';
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = 'Sin Stock';
        addBtn.style.opacity = '0.5';
      }
    } else {
      if (stockStatus) {
        if (product.stock <= 3) {
          stockStatus.innerHTML = `<span style="color: var(--color-warning);"><i class="fas fa-exclamation-triangle"></i> ¡Últimas unidades! (${product.stock} restantes)</span>`;
        } else {
          stockStatus.innerHTML = `<span style="color: var(--color-success);"><i class="fas fa-check-circle"></i> En stock disponible (${product.stock} unidades)</span>`;
        }
      }
      if (qtyPicker) qtyPicker.style.display = 'flex';
      if (addBtn) {
        addBtn.disabled = false;
        addBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Agregar al Carrito`;
        addBtn.style.opacity = '1';
      }
    }

    // Set up quantity picker events in modal
    const newQtyDec = qtyDec.cloneNode(true);
    const newQtyInc = qtyInc.cloneNode(true);
    qtyDec.parentNode.replaceChild(newQtyDec, qtyDec);
    qtyInc.parentNode.replaceChild(newQtyInc, qtyInc);

    newQtyDec.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyVal.textContent = currentQty;
      }
    });

    newQtyInc.addEventListener('click', () => {
      if (currentQty < product.stock) {
        currentQty++;
        qtyVal.textContent = currentQty;
      } else {
        this.showToast('Límite alcanzado', `Dispones de un stock máximo de ${product.stock} unidades.`, 'warning');
      }
    });

    // Set up Add button click event
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    
    if (product.stock > 0) {
      newAddBtn.addEventListener('click', () => {
        onAddToCart(product, currentQty);
        overlay.classList.remove('active');
      });
    }

    // Close Modal events
    const closeModal = () => {
      overlay.classList.remove('active');
    };
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Open Modal
    overlay.classList.add('active');
  },

  // Render client product grid
  renderStoreProducts(products, onAddToCart) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';
    if (products.length === 0) {
      grid.innerHTML = `
        <div class="cart-empty" style="grid-column: 1/-1; padding: 4rem 0;">
          <i class="fas fa-search"></i>
          <p>No encontramos productos que coincidan con tu búsqueda.</p>
        </div>
      `;
      return;
    }

    products.forEach(prod => {
      const card = document.createElement('div');
      card.className = `product-card ${prod.stock === 0 ? 'out-of-stock' : ''}`;
      
      let badgeHtml = '';
      if (prod.stock === 0) {
        badgeHtml = `<span class="product-badge-out">Sin Stock</span>`;
      } else if (prod.stock <= 3) {
        badgeHtml = `<span class="product-badge-low">Últimos disponibles (${prod.stock})</span>`;
      }

      card.innerHTML = `
        ${badgeHtml}
        <div class="product-img-wrapper">
          <img src="${prod.image}" alt="${prod.name}" class="product-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop'">
        </div>
        <div class="product-info">
          <span class="product-cat">${prod.category}</span>
          <h3 class="product-name">${prod.name}</h3>
          <p class="product-desc">${prod.description}</p>
          <div class="product-footer">
            <span class="product-price">${this.formatCurrency(prod.price)}</span>
            
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              ${prod.stock > 0 ? `
                <div class="store-qty-picker" style="display: flex; align-items: center; border: 1px solid var(--border-glass); border-radius: var(--radius-sm); background-color: var(--bg-primary); overflow: hidden; height: 38px;">
                  <button class="qty-btn dec-btn" style="background: none; border: none; cursor: pointer; width: 24px; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-secondary); transition: background-color var(--transition-fast);">&minus;</button>
                  <span class="qty-val" style="width: 24px; text-align: center; font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">1</span>
                  <button class="qty-btn inc-btn" style="background: none; border: none; cursor: pointer; width: 24px; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-secondary); transition: background-color var(--transition-fast);">&plus;</button>
                </div>
              ` : ''}
              
              <button class="product-add-btn" data-id="${prod.id}" title="${prod.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}" ${prod.stock === 0 ? 'disabled' : ''} style="height: 38px; width: 38px;">
                <i class="fas ${prod.stock === 0 ? 'fa-ban' : 'fa-shopping-cart'}"></i>
              </button>
            </div>
          </div>
        </div>
      `;

      // Event listener for adding to cart with quantity
      const btn = card.querySelector('.product-add-btn');
      let currentQty = 1;
      
      if (btn && prod.stock > 0) {
        const qtyVal = card.querySelector('.qty-val');
        const decBtn = card.querySelector('.dec-btn');
        const incBtn = card.querySelector('.inc-btn');

        if (decBtn && incBtn && qtyVal) {
          decBtn.addEventListener('click', () => {
            if (currentQty > 1) {
              currentQty--;
              qtyVal.textContent = currentQty;
            }
          });

          incBtn.addEventListener('click', () => {
            if (currentQty < prod.stock) {
              currentQty++;
              qtyVal.textContent = currentQty;
            } else {
              this.showToast('Límite alcanzado', `Dispones de un stock máximo de ${prod.stock} unidades.`, 'warning');
            }
          });
        }

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          onAddToCart(prod, currentQty);
        });
      }

      // Stop click event propagation on interactive elements inside card
      const picker = card.querySelector('.store-qty-picker');
      if (picker) {
        picker.addEventListener('click', (e) => e.stopPropagation());
      }

      // Click card to open detail modal
      card.addEventListener('click', () => {
        this.showProductDetailModal(prod, onAddToCart);
      });

      grid.appendChild(card);
    });
  },

  // Render shopping cart drawer contents
  renderCart(cartItems, onUpdateQuantity, onRemoveItem) {
    const list = document.getElementById('cart-items-list');
    const badge = document.getElementById('cart-badge');
    const badgeMobile = document.getElementById('cart-badge-mobile');
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');
    const progressEl = document.getElementById('shipping-progress-fill');
    const shippingText = document.getElementById('shipping-text');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!list) return;

    // Update Badges
    const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) {
      badge.textContent = totalCount;
      badge.style.display = totalCount > 0 ? 'flex' : 'none';
    }
    if (badgeMobile) {
      badgeMobile.textContent = totalCount;
      badgeMobile.style.display = totalCount > 0 ? 'flex' : 'none';
    }

    list.innerHTML = '';
    
    if (cartItems.length === 0) {
      list.innerHTML = `
        <div class="cart-empty">
          <i class="fas fa-shopping-basket"></i>
          <p>Tu carrito está vacío</p>
          <small style="color: var(--text-secondary);">Agrega productos del catálogo para comenzar.</small>
        </div>
      `;
      subtotalEl.textContent = this.formatCurrency(0);
      taxEl.textContent = this.formatCurrency(0);
      totalEl.textContent = this.formatCurrency(0);
      progressEl.style.width = '0%';
      shippingText.textContent = 'Agrega productos para conseguir envío gratis';
      checkoutBtn.disabled = true;
      return;
    }

    checkoutBtn.disabled = false;
    let subtotal = 0;

    cartItems.forEach(item => {
      subtotal += item.price * item.quantity;
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <h4 class="cart-item-name">${item.name}</h4>
          <span class="cart-item-price">${this.formatCurrency(item.price)}</span>
          <div class="cart-item-controls" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; margin-top: 0.5rem;">
            <div class="quantity-picker">
              <button class="quantity-btn dec-qty-btn" title="Disminuir cantidad" style="height: 28px; width: 28px;">&minus;</button>
              <span class="quantity-value" style="font-weight: 700;">${item.quantity}</span>
              <button class="quantity-btn inc-qty-btn" title="Aumentar cantidad" style="height: 28px; width: 28px;">&plus;</button>
            </div>
            <button class="cart-item-remove" title="Eliminar del carrito" style="padding: 4px 8px; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; border: 1px solid var(--border-glass); border-radius: var(--radius-sm); background-color: var(--bg-secondary); cursor: pointer; color: var(--color-danger);">
              <i class="fas fa-trash-alt"></i> Quitar
            </button>
          </div>
        </div>
      `;

      // Event handlers for cart item modifications
      itemEl.querySelector('.dec-qty-btn').addEventListener('click', () => {
        onUpdateQuantity(item.id, item.quantity - 1);
      });

      itemEl.querySelector('.inc-qty-btn').addEventListener('click', () => {
        onUpdateQuantity(item.id, item.quantity + 1);
      });

      itemEl.querySelector('.cart-item-remove').addEventListener('click', () => {
        onRemoveItem(item.id);
      });

      list.appendChild(itemEl);
    });

    const tax = Math.round(subtotal * 0.21);
    const total = subtotal + tax;

    subtotalEl.textContent = this.formatCurrency(subtotal);
    taxEl.textContent = this.formatCurrency(tax);
    totalEl.textContent = this.formatCurrency(total);

    // Free Shipping progress bar (Free shipping at $1.000.000)
    const FREE_SHIPPING_LIMIT = 1000000;
    const progressPercent = Math.min((total / FREE_SHIPPING_LIMIT) * 100, 100);
    progressEl.style.width = `${progressPercent}%`;
    
    if (total >= FREE_SHIPPING_LIMIT) {
      shippingText.innerHTML = `<span style="color: var(--color-success); font-weight: 700;"><i class="fas fa-truck"></i> ¡Felicidades! Tienes envío gratis.</span>`;
    } else {
      const remaining = FREE_SHIPPING_LIMIT - total;
      shippingText.innerHTML = `Te faltan <strong>${this.formatCurrency(remaining)}</strong> para conseguir envío gratis`;
    }
  },

  // Render seller dashboard statistical cards
  renderDashboardStats(products, orders) {
    const totalVentasEl = document.getElementById('stat-total-ventas');
    const totalPedidosEl = document.getElementById('stat-total-pedidos');
    const totalProductosEl = document.getElementById('stat-total-productos');
    const totalGananciaEl = document.getElementById('stat-total-ganancias');

    if (!totalVentasEl) return;

    // Total orders count
    totalPedidosEl.textContent = orders.length;

    // Total sales revenue and cost of goods sold
    let totalRevenue = 0;
    let totalCostOfGoods = 0;
    let successSalesCount = 0;

    orders.forEach(order => {
      // Consider delivered, billed, or completed-without-invoice orders for sales analytics
      if (['Entregado', 'Facturado', 'Completado (Sin Factura)'].includes(order.status)) {
        totalRevenue += order.subtotal; // Subtotal excludes 21% IVA tax
        successSalesCount++;
        
        // Sum up margins/cost
        order.items.forEach(item => {
          const originalProd = products.find(p => p.id === item.productId);
          if (originalProd) {
            totalCostOfGoods += (originalProd.cost || 0) * item.quantity;
          }
        });
      }
    });

    totalVentasEl.textContent = this.formatCurrency(totalRevenue);
    
    // Total product references
    totalProductosEl.textContent = products.length;

    // Gross profits margin
    const grossProfit = totalRevenue - totalCostOfGoods;
    totalGananciaEl.textContent = this.formatCurrency(grossProfit);

    // ---- NEW: Daily Sales Breakdown ----
    const dailyData = {};
    orders.forEach(order => {
      if (['Entregado', 'Facturado', 'Completado (Sin Factura)'].includes(order.status)) {
        const dateObj = new Date(order.date);
        const localDateStr = dateObj.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        
        if (!dailyData[localDateStr]) {
          dailyData[localDateStr] = {
            salesCount: 0,
            totalNet: 0,
            profit: 0
          };
        }
        
        dailyData[localDateStr].salesCount++;
        dailyData[localDateStr].totalNet += order.subtotal;
        
        let orderCost = 0;
        order.items.forEach(item => {
          const originalProd = products.find(p => p.id === item.productId);
          if (originalProd) {
            orderCost += (originalProd.cost || 0) * item.quantity;
          }
        });
        
        dailyData[localDateStr].profit += (order.subtotal - orderCost);
      }
    });

    const dailyTbody = document.getElementById('daily-summary-table-body');
    if (dailyTbody) {
      dailyTbody.innerHTML = '';
      const sortedDays = Object.keys(dailyData).sort((a, b) => {
        const parseDate = (dStr) => {
          const parts = dStr.split('/');
          return new Date(parts[2], parts[1] - 1, parts[0]);
        };
        return parseDate(b) - parseDate(a);
      });
      
      if (sortedDays.length === 0) {
        dailyTbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
              No hay ventas registradas en el período seleccionado.
            </td>
          </tr>
        `;
      } else {
        sortedDays.forEach(day => {
          const data = dailyData[day];
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${day}</strong></td>
            <td style="text-align: center;">${data.salesCount}</td>
            <td style="text-align: right; font-weight: 600;">${this.formatCurrency(data.totalNet)}</td>
            <td style="text-align: right; color: var(--color-success); font-weight: 600;">${this.formatCurrency(data.profit)}</td>
          `;
          dailyTbody.appendChild(tr);
        });
      }
    }

    // ---- NEW: Payment Methods Breakdown ----
    const paymentCounts = {
      transferencia: { count: 0, amount: 0 },
      tarjeta: { count: 0, amount: 0 },
      efectivo: { count: 0, amount: 0 }
    };
    let totalValidOrders = 0;
    
    orders.forEach(order => {
      if (['Entregado', 'Facturado', 'Completado (Sin Factura)'].includes(order.status)) {
        const method = (order.paymentMethod || 'transferencia').toLowerCase();
        if (paymentCounts[method] !== undefined) {
          paymentCounts[method].count++;
          paymentCounts[method].amount += order.total;
          totalValidOrders++;
        }
      }
    });
    
    const paymentContainer = document.getElementById('payment-methods-summary');
    if (paymentContainer) {
      paymentContainer.innerHTML = '';
      
      const methods = [
        { key: 'transferencia', label: 'Transferencia Bancaria', icon: 'fa-university' },
        { key: 'tarjeta', label: 'Tarjeta de Crédito/Débito', icon: 'fa-credit-card' },
        { key: 'efectivo', label: 'Efectivo / Trato Directo', icon: 'fa-money-bill-wave' }
      ];
      
      methods.forEach(m => {
        const data = paymentCounts[m.key];
        const percent = totalValidOrders > 0 ? Math.round((data.count / totalValidOrders) * 100) : 0;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'distribution-item';
        itemEl.innerHTML = `
          <div class="distribution-meta">
            <span><i class="fas ${m.icon}" style="width: 20px;"></i> ${m.label}</span>
            <span>${data.count} (${percent}%) - <strong>${this.formatCurrency(data.amount)}</strong></span>
          </div>
          <div class="distribution-bar-bg">
            <div class="distribution-bar-fill ${m.key}" style="width: ${percent}%;"></div>
          </div>
        `;
        paymentContainer.appendChild(itemEl);
      });
    }

    // ---- NEW: Order Statuses Breakdown ----
    const statusCounts = {
      'Pendiente': 0,
      'En Proceso': 0,
      'Entregado': 0,
      'Facturado': 0,
      'Completado (Sin Factura)': 0,
      'Pendiente de Stock': 0,
      'Cancelado': 0
    };
    let totalAllOrders = orders.length;
    
    orders.forEach(order => {
      if (statusCounts[order.status] !== undefined) {
        statusCounts[order.status]++;
      }
    });
    
    const statusContainer = document.getElementById('order-status-summary');
    if (statusContainer) {
      statusContainer.innerHTML = '';
      
      const statuses = [
        { label: 'Pendiente de Aprobación', countKey: 'Pendiente', class: 'pendiente' },
        { label: 'En Preparación / Proceso', countKey: 'En Proceso', class: 'en-proceso' },
        { label: 'Entregados (Pendiente Facturación)', countKey: 'Entregado', class: 'entregado' },
        { label: 'Facturados (AFIP)', countKey: 'Facturado', class: 'facturado' },
        { label: 'Completados sin Factura', countKey: 'Completado (Sin Factura)', class: 'completado-sin-factura' },
        { label: 'Pendientes de Stock', countKey: 'Pendiente de Stock', class: 'pendiente-de-stock' },
        { label: 'Cancelados', countKey: 'Cancelado', class: 'cancelado' }
      ];
      
      statuses.forEach(s => {
        const count = statusCounts[s.countKey] || 0;
        const percent = totalAllOrders > 0 ? Math.round((count / totalAllOrders) * 100) : 0;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'distribution-item';
        itemEl.innerHTML = `
          <div class="distribution-meta">
            <span>${s.label}</span>
            <span>${count} (${percent}%)</span>
          </div>
          <div class="distribution-bar-bg">
            <div class="distribution-bar-fill ${s.class}" style="width: ${percent}%;"></div>
          </div>
        `;
        statusContainer.appendChild(itemEl);
      });
    }
  },

  // Render seller inventory control list (CRUD table)
  renderInventoryTable(products, onEdit, onDelete) {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
            No hay productos cargados en el stock. Haz click en "Agregar Producto" para iniciar.
          </td>
        </tr>
      `;
      return;
    }

    products.forEach(prod => {
      const tr = document.createElement('tr');
      
      let stockStatusClass = 'in-stock';
      let stockStatusText = 'En Stock';
      if (prod.stock === 0) {
        stockStatusClass = 'out-of-stock';
        stockStatusText = 'Sin Stock';
      } else if (prod.stock <= 3) {
        stockStatusClass = 'low-stock';
        stockStatusText = `Bajo Stock (${prod.stock})`;
      } else {
        stockStatusText = `Disponible (${prod.stock})`;
      }

      tr.innerHTML = `
        <td>
          <div class="table-product-cell">
            <img src="${prod.image}" alt="${prod.name}" class="table-img" onerror="this.src='https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop'">
            <div>
              <div class="table-product-name">${prod.name}</div>
              <div class="table-product-cat">${prod.category}</div>
            </div>
          </div>
        </td>
        <td style="font-weight: 600;">${this.formatCurrency(prod.price)}</td>
        <td style="color: var(--text-secondary);">${this.formatCurrency(prod.cost)}</td>
        <td style="color: var(--color-success); font-weight: 600;">
          ${this.formatCurrency(prod.price - prod.cost)}
        </td>
        <td>
          <span class="table-stock-status ${stockStatusClass}">
            <i class="fas ${prod.stock === 0 ? 'fa-times-circle' : prod.stock <= 3 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
            ${stockStatusText}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-icon-btn edit" data-id="${prod.id}" title="Editar producto">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-icon-btn delete" data-id="${prod.id}" title="Eliminar producto">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.edit').addEventListener('click', () => onEdit(prod));
      tr.querySelector('.delete').addEventListener('click', () => onDelete(prod.id));

      tbody.appendChild(tr);
    });
  },

  // Render seller order tracker logs
  renderOrdersTable(products, orders, onUpdateStatus, onInvoice, onCompleteNoInvoice) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
            No se han registrado pedidos en el sistema.
          </td>
        </tr>
      `;
      return;
    }

    // Sort orders from newest to oldest
    const sortedOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedOrders.forEach(order => {
      const tr = document.createElement('tr');
      const formattedDate = this.formatDate(order.date);
      const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

      // Action buttons template based on current order status
      let actionButtons = '';
      
      if (order.status === 'Pendiente' || order.status === 'Pendiente de Stock') {
        actionButtons = `
          <button class="action-icon-btn edit change-status" data-status="En Proceso" title="Aceptar y procesar pedido" style="color: var(--color-success); border-color: var(--color-success-bg);">
            <i class="fas fa-check-circle"></i>
          </button>
          <button class="action-icon-btn edit change-status" data-status="Pendiente de Stock" title="Dejar pendiente de stock" style="color: var(--color-warning); border-color: var(--color-warning-bg);">
            <i class="fas fa-warehouse"></i>
          </button>
          <button class="action-icon-btn delete change-status" data-status="Cancelado" title="Cancelar pedido" style="color: var(--color-danger); border-color: var(--color-danger-bg);">
            <i class="fas fa-ban"></i>
          </button>
        `;
      } else if (order.status === 'En Proceso') {
        actionButtons = `
          <button class="action-icon-btn edit change-status" data-status="Entregado" title="Marcar como entregado">
            <i class="fas fa-truck-loading"></i>
          </button>
          <button class="action-icon-btn delete change-status" data-status="Cancelado" title="Cancelar pedido" style="color: var(--color-danger); border-color: var(--color-danger-bg);">
            <i class="fas fa-ban"></i>
          </button>
        `;
      } else if (order.status === 'Entregado') {
        actionButtons = `
          <button class="action-icon-btn invoice generate-invoice" title="Emitir Facturación AFIP">
            <i class="fas fa-file-invoice-dollar"></i>
          </button>
          <button class="action-icon-btn edit complete-no-invoice" title="Completar sin Factura (Trato Personal)">
            <i class="fas fa-handshake"></i>
          </button>
          <button class="action-icon-btn delete change-status" data-status="Cancelado" title="Cancelar pedido" style="color: var(--color-danger); border-color: var(--color-danger-bg);">
            <i class="fas fa-ban"></i>
          </button>
        `;
      } else if (order.status === 'Facturado') {
        actionButtons = `
          <button class="action-icon-btn invoice view-invoice" title="Ver e imprimir factura de venta">
            <i class="fas fa-print"></i>
          </button>
        `;
      } else if (order.status === 'Completado (Sin Factura)') {
        actionButtons = `
          <button class="action-icon-btn invoice view-receipt" title="Ver e imprimir recibo de venta">
            <i class="fas fa-receipt"></i>
          </button>
        `;
      } else if (order.status === 'Cancelado') {
        actionButtons = `
          <span style="font-size: 0.8rem; color: var(--color-danger); font-weight: 600;"><i class="fas fa-times-circle"></i> Cancelado</span>
        `;
      }

      tr.innerHTML = `
        <td><strong style="color: var(--accent-color);">${order.id.split('-')[1] || order.id}</strong></td>
        <td>
          <div>
            <div style="font-weight: 700;">${order.customerName}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">${order.customerCuit || 'Consumidor Final'}</div>
          </div>
        </td>
        <td style="color: var(--text-secondary); font-size: 0.85rem;">${formattedDate}</td>
        <td>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">${itemsCount} art.</div>
          <div style="font-weight: 800;">${this.formatCurrency(order.total)}</div>
        </td>
        <td>
          <span class="status-badge ${order.status === 'Completado (Sin Factura)' ? 'completado-sin-factura' : order.status.toLowerCase().replace(' ', '-')}">
            ${order.status}
          </span>
        </td>
        <td>
          <div class="table-actions">
            ${actionButtons}
          </div>
        </td>
      `;

      // Set event listeners for order actions
      tr.querySelectorAll('.change-status').forEach(btn => {
        btn.addEventListener('click', () => {
          const newStatus = btn.getAttribute('data-status');
          onUpdateStatus(order.id, newStatus);
        });
      });

      const invoiceBtn = tr.querySelector('.generate-invoice');
      if (invoiceBtn) {
        invoiceBtn.addEventListener('click', () => {
          onInvoice(order.id);
        });
      }

      const noInvoiceBtn = tr.querySelector('.complete-no-invoice');
      if (noInvoiceBtn) {
        noInvoiceBtn.addEventListener('click', () => {
          onCompleteNoInvoice(order.id);
        });
      }

      const viewInvoiceBtn = tr.querySelector('.view-invoice');
      if (viewInvoiceBtn) {
        viewInvoiceBtn.addEventListener('click', () => {
          this.showInvoiceModal(order);
        });
      }

      const viewReceiptBtn = tr.querySelector('.view-receipt');
      if (viewReceiptBtn) {
        viewReceiptBtn.addEventListener('click', () => {
          this.showInvoiceModal(order);
        });
      }

      tbody.appendChild(tr);
    });
  },


  // Open AFIP Invoice preview modal (printable)
  showInvoiceModal(order) {
    let overlay = document.getElementById('invoice-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'invoice-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const isNoInvoice = order.status === 'Completado (Sin Factura)';
    const settings = this.currentSettings || {};
    const sellerName = settings.sellerName || "MIRANDA SPORT";
    const sellerCuit = settings.sellerCuit || "30-71850122-3";
    const sellerAddress = settings.sellerAddress || "Av. del Libertador 4200, CABA, Argentina";
    const sellerPhone = settings.sellerPhone || "011-4892-7491";
    const sellerEmail = settings.sellerEmail || "ventas@mirandasport.com.ar";
    const sellerIva = settings.sellerIva || "IVA Responsable Inscripto";
    const sellerActivityStart = settings.sellerActivityStart || "01/03/2021";
    const showPhone = settings.showPhoneOnReceipt !== false;
    const showEmail = settings.showEmailOnReceipt !== false;
    const showAddress = settings.showAddressOnReceipt !== false;
    const showCuit = settings.showCuitOnReceipt !== false;

    let contactParts = [];
    if (showPhone && sellerPhone) contactParts.push(`Tel: ${sellerPhone}`);
    if (showEmail && sellerEmail) contactParts.push(sellerEmail);
    const contactLine = contactParts.length > 0 ? `${contactParts.join(' / ')}<br>` : '';

    // Set structure inside the modal overlay
    const itemsRowsHtml = order.items.map((item, index) => {
      const itemSubtotal = item.price * item.quantity;
      const unitNetPrice = isNoInvoice ? item.price : Math.round(item.price / 1.21); // Extract 21% VAT if invoiced
      const itemNetSubtotal = unitNetPrice * item.quantity;
      const vat = isNoInvoice ? 0 : (itemSubtotal - itemNetSubtotal);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${this.formatCurrency(unitNetPrice)}</td>
          <td style="text-align: center;">${isNoInvoice ? '0%' : '21%'}</td>
          <td style="text-align: right;">${this.formatCurrency(vat)}</td>
          <td style="text-align: right;">${this.formatCurrency(itemSubtotal)}</td>
        </tr>
      `;
    }).join('');

    overlay.className = 'modal-overlay active';

    // Document header elements depending on type (AFIP invoice A/B or Recibo X)
    const docTitle = isNoInvoice ? 'RECIBO DE VENTA' : 'FACTURA';
    const docLetter = isNoInvoice ? 'X' : order.invoiceType;
    const docCode = isNoInvoice ? 'DOCUMENTO NO VÁLIDO COMO FACTURA' : `COD. 0${order.invoiceType === 'A' ? '01' : '06'}`;
    const compNum = isNoInvoice ? `0001-${(order.id.split('-')[1] || order.id).slice(-8).padStart(8, '0')}` : order.invoiceNumber;

    let footerHtml = '';
    if (isNoInvoice) {
      footerHtml = `
        <div class="invoice-afip-footer" style="border-top: 1px dashed #000; padding-top: 1rem; margin-top: 2rem;">
          <div style="display: flex; align-items: center; gap: 1rem; width: 100%; justify-content: space-between;">
            <div>
              <strong>DOCUMENTO NO VALIDO COMO FACTURA</strong><br>
              <small style="color: #666; font-size: 8px;">Comprobante de uso interno / transacción exenta por trato directo con el vendedor.</small>
            </div>
            <div style="text-align: right;">
              <strong>${sellerName}</strong><br>
              <small style="color: #666; font-size: 8px;">¡Muchas gracias por su confianza!</small>
            </div>
          </div>
        </div>
      `;
    } else {
      footerHtml = `
        <div class="invoice-afip-footer">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <!-- Mini barcode and QR representation -->
            <div class="invoice-qr-code">
              QR AFIP<br>
              <i class="fas fa-qrcode" style="font-size: 24px; margin-top: 2px;"></i>
            </div>
            <div>
              <strong>Comprobante Autorizado por AFIP ARCA</strong><br>
              <small style="color: #666; font-size: 8px;">Este comprobante cuenta con validez legal ante las normativas impositivas vigentes.</small>
            </div>
          </div>
          
          <div class="invoice-afip-cae-box">
            <div class="invoice-afip-cae-row">
              <strong>CAE Nº:</strong> ${order.cae}
            </div>
            <div>
              <strong>Fecha Vto. CAE:</strong> ${order.caeDueDate}
            </div>
          </div>
        </div>
        
        <div class="invoice-barcode-container">
          <div class="invoice-barcode">*${order.cae}${order.date.replace(/-/g, '').split('T')[0]}*</div>
          <div style="font-size: 7px; font-family: monospace;">Barcode: ${order.cae} - Vto: ${order.caeDueDate}</div>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 850px; padding: 1.5rem;">
        <button class="modal-close" id="invoice-modal-close-btn">&times;</button>
        
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-bottom: 1rem; padding-right: 1rem;">
          <button class="btn btn-secondary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir ${isNoInvoice ? 'Recibo' : 'Factura'}</button>
        </div>

        <div class="invoice-container">
          <!-- 1. Comp Header -->
          <div class="invoice-header-box">
            <div class="invoice-header-left">
              <h1>${sellerName}</h1>
              <div style="font-size: 10px; color: #444;">
                Equipamiento de Fitness y Gimnasios de Alta Gama<br>
                ${showAddress ? `${sellerAddress}<br>` : ''}
                ${contactLine}
                ${sellerIva}
              </div>
            </div>
            
            <div class="invoice-header-center-divider">
              <div class="invoice-header-type">
                ${docLetter}
                <span>${docCode}</span>
              </div>
            </div>
            
            <div class="invoice-header-right">
              <h2>${docTitle}</h2>
              <div>
                <strong>Nº Comp.:</strong> ${compNum}<br>
                <strong>Fecha Comp.:</strong> ${order.date.split('T')[0]}<br>
                ${showCuit ? `<strong>CUIT:</strong> ${sellerCuit}<br>
                <strong>Ingr. Brutos:</strong> ${sellerCuit}<br>` : ''}
                <strong>Inic. Actividades:</strong> ${sellerActivityStart}
              </div>
            </div>
          </div>

          <!-- 2. Details Grid -->
          <div class="invoice-details-grid">
            <div>
              <strong>Periodo Facturado Desde:</strong> ${order.date.split('T')[0]}
            </div>
            <div style="text-align: right;">
              <strong>Hasta:</strong> ${order.date.split('T')[0]} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Vto. de Pago:</strong> ${order.date.split('T')[0]}
            </div>
          </div>

          <!-- 3. Customer Info Box -->
          <div class="invoice-party-box">
            <div class="invoice-party-row">
              <strong>CUIT / DNI:</strong>
              <span>${order.customerCuit || 'Consumidor Final'}</span>
            </div>
            <div class="invoice-party-row">
              <strong>Nombre / Razón:</strong>
              <span>${order.customerName}</span>
            </div>
            <div class="invoice-party-row">
              <strong>Condición IVA:</strong>
              <span>${isNoInvoice ? 'Exento / Trato Directo' : (order.invoiceType === 'A' ? 'IVA Responsable Inscripto' : 'Consumidor Final')}</span>
            </div>
            <div class="invoice-party-row">
              <strong>Domicilio Comercial:</strong>
              <span>${order.customerAddress || 'No informado'}</span>
            </div>
          </div>

          <!-- 4. Items List -->
          <table class="invoice-table">
            <thead>
              <tr>
                <th style="width: 30px;">Cód.</th>
                <th>Descripción / Concepto</th>
                <th style="width: 50px; text-align: center;">Cant.</th>
                <th style="width: 90px; text-align: right;">Precio Unit. Neto</th>
                <th style="width: 40px; text-align: center;">IVA</th>
                <th style="width: 80px; text-align: right;">Alícuota IVA</th>
                <th style="width: 90px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <!-- 5. Totals -->
          <div class="invoice-totals-area">
            <div class="invoice-totals-box">
              <div class="invoice-totals-row">
                <span>Importe Neto Gravado:</span>
                <span>${this.formatCurrency(order.subtotal)}</span>
              </div>
              <div class="invoice-totals-row">
                <span>IVA (${isNoInvoice ? '0.00' : '21.00'}%):</span>
                <span>${this.formatCurrency(order.tax)}</span>
              </div>
              <div class="invoice-totals-row grand-total">
                <span>Importe Total:</span>
                <span>${this.formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <!-- 6. Footer section -->
          ${footerHtml}
        </div>
      </div>
    `;

    // Modal Close action
    overlay.querySelector('#invoice-modal-close-btn').addEventListener('click', () => {
      overlay.className = 'modal-overlay';
    });
  },

  // Render user management table
  renderUsersTable(users, onEdit, onDelete) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
            No hay usuarios cargados en el sistema.
          </td>
        </tr>
      `;
      return;
    }

    users.forEach(user => {
      const tr = document.createElement('tr');
      
      const roleText = user.role === 'admin' ? 'Administrador General' : 'Vendedor de Salón';
      const roleClass = user.role === 'admin' ? 'table-stock-status in-stock' : 'table-stock-status low-stock';
      
      tr.innerHTML = `
        <td>
          <div style="font-weight: 700;">${user.name}</div>
        </td>
        <td>
          <code style="font-family: monospace; font-size: 0.9rem;">${user.username}</code>
        </td>
        <td>
          <span class="${roleClass}" style="display: inline-flex; align-items: center; gap: 0.25rem;">
            <i class="fas ${user.role === 'admin' ? 'fa-user-shield' : 'fa-user'}"></i>
            ${roleText}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-icon-btn edit" data-id="${user.id}" title="Editar usuario">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-icon-btn delete" data-id="${user.id}" title="Eliminar usuario" ${user.id === 'usr-1' ? 'disabled' : ''}>
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.edit').addEventListener('click', () => onEdit(user));
      tr.querySelector('.delete').addEventListener('click', () => onDelete(user.id));

      tbody.appendChild(tr);
    });
  },

  // Apply customizable storefront settings (texts, images, themes, glows)
  applyStoreSettings(settings) {
    if (!settings) return;
    this.currentSettings = settings;

    // Apply social contact details (WhatsApp, Instagram, Email)
    const cleanWhatsapp = settings.contactWhatsapp ? settings.contactWhatsapp.trim().replace(/\D/g, '') : '';
    
    const floatWaBtn = document.getElementById('whatsapp-floating-btn');
    if (floatWaBtn) {
      if (cleanWhatsapp) {
        floatWaBtn.href = `https://wa.me/${cleanWhatsapp}`;
        floatWaBtn.style.display = 'flex';
      } else {
        floatWaBtn.style.display = 'none';
      }
    }

    const footerWa = document.getElementById('footer-link-whatsapp');
    if (footerWa) {
      if (cleanWhatsapp) {
        footerWa.href = `https://wa.me/${cleanWhatsapp}`;
        footerWa.style.display = 'inline-block';
      } else {
        footerWa.style.display = 'none';
      }
    }

    const footerIg = document.getElementById('footer-link-instagram');
    if (footerIg) {
      const cleanIg = settings.contactInstagram ? settings.contactInstagram.trim().replace(/^@/, '') : '';
      if (cleanIg) {
        footerIg.href = `https://instagram.com/${cleanIg}`;
        footerIg.style.display = 'inline-block';
      } else {
        footerIg.style.display = 'none';
      }
    }

    const footerEmail = document.getElementById('footer-link-email');
    if (footerEmail) {
      const email = settings.sellerEmail || '';
      if (email) {
        footerEmail.href = `mailto:${email.trim()}`;
        footerEmail.style.display = 'inline-block';
      } else {
        footerEmail.style.display = 'none';
      }
    }

    // Apply texts
    const titleEl = document.querySelector('.hero-title');
    if (titleEl && settings.heroTitle) {
      const words = settings.heroTitle.split(' ');
      if (words.length > 1) {
        const lastWord = words.pop();
        titleEl.innerHTML = words.join(' ') + ` <span>${lastWord}</span>`;
      } else {
        titleEl.textContent = settings.heroTitle;
      }
    }

    const descEl = document.querySelector('.hero-desc');
    if (descEl && settings.heroDesc) {
      descEl.textContent = settings.heroDesc;
    }

    const imgEl = document.querySelector('.hero-image');
    if (imgEl && settings.heroImage) {
      imgEl.src = settings.heroImage;
    }

    // Apply color theme variables
    const root = document.documentElement;
    const theme = settings.themeColor || 'pink';
    
    // Theme palette mappings
    const themePalettes = {
      pink: {
        '--logo-pink': '#f9a0be',
        '--logo-pink-light': '#fcd5e2',
        '--logo-pink-dark': '#d66487',
        '--accent-color': '#ff3e83',
        '--accent-color-hover': '#e0286b',
        '--bg-primary-light': '#fff5f7',
        '--bg-tertiary-light': '#fcd5e2',
        '--border-glass-light': 'rgba(255, 160, 190, 0.3)',
        '--accent-glow': 'rgba(255, 62, 131, 0.4)'
      },
      purple: {
        '--logo-pink': '#c084fc',
        '--logo-pink-light': '#f3e8ff',
        '--logo-pink-dark': '#9333ea',
        '--accent-color': '#a855f7',
        '--accent-color-hover': '#7e22ce',
        '--bg-primary-light': '#faf5ff',
        '--bg-tertiary-light': '#f3e8ff',
        '--border-glass-light': 'rgba(192, 132, 252, 0.3)',
        '--accent-glow': 'rgba(168, 85, 247, 0.4)'
      },
      blue: {
        '--logo-pink': '#7dd3fc',
        '--logo-pink-light': '#e0f2fe',
        '--logo-pink-dark': '#0369a1',
        '--accent-color': '#0ea5e9',
        '--accent-color-hover': '#0284c7',
        '--bg-primary-light': '#f0f9ff',
        '--bg-tertiary-light': '#e0f2fe',
        '--border-glass-light': 'rgba(125, 211, 252, 0.3)',
        '--accent-glow': 'rgba(14, 165, 233, 0.4)'
      },
      neon: {
        '--logo-pink': '#ff2a75',
        '--logo-pink-light': '#ffe4ee',
        '--logo-pink-dark': '#c20044',
        '--accent-color': '#ff0055',
        '--accent-color-hover': '#b3003b',
        '--bg-primary-light': '#fff0f5',
        '--bg-tertiary-light': '#ffe4ee',
        '--border-glass-light': 'rgba(255, 42, 117, 0.3)',
        '--accent-glow': 'rgba(255, 0, 85, 0.4)'
      },
      coral: {
        '--logo-pink': '#fca5a5',
        '--logo-pink-light': '#fee2e2',
        '--logo-pink-dark': '#b91c1c',
        '--accent-color': '#f87171',
        '--accent-color-hover': '#dc2626',
        '--bg-primary-light': '#fff5f5',
        '--bg-tertiary-light': '#fee2e2',
        '--border-glass-light': 'rgba(252, 165, 165, 0.3)',
        '--accent-glow': 'rgba(248, 113, 113, 0.4)'
      }
    };

    const palette = themePalettes[theme] || themePalettes.pink;
    
    // Apply static mappings
    root.style.setProperty('--logo-pink', palette['--logo-pink']);
    root.style.setProperty('--logo-pink-light', palette['--logo-pink-light']);
    root.style.setProperty('--logo-pink-dark', palette['--logo-pink-dark']);
    root.style.setProperty('--accent-color', palette['--accent-color']);
    root.style.setProperty('--accent-color-hover', palette['--accent-color-hover']);
    root.style.setProperty('--accent-glow', palette['--accent-glow']);

    // Check current theme mode (light/dark)
    const currentMode = root.getAttribute('data-theme') || 'light';
    if (currentMode === 'light') {
      root.style.setProperty('--bg-primary', palette['--bg-primary-light']);
      root.style.setProperty('--bg-tertiary', palette['--bg-tertiary-light']);
      root.style.setProperty('--border-glass', palette['--border-glass-light']);
    } else {
      // For dark theme, keep slate background but use theme for border accents
      root.style.setProperty('--border-glass', `rgba(${theme === 'pink' ? '255, 160, 190' : theme === 'purple' ? '192, 132, 252' : theme === 'blue' ? '125, 211, 252' : theme === 'neon' ? '255, 42, 117' : '252, 165, 165'}, 0.15)`);
    }

    // Toggle sparkles/glows
    this.createGlowEffects(settings.glowEffects === true);
  },

  // Create floating sparkle elements in page background
  createGlowEffects(enabled) {
    let container = document.getElementById('glow-sparkles-container');
    if (!enabled) {
      if (container) container.remove();
      return;
    }

    if (container) return; // Already running

    container = document.createElement('div');
    container.id = 'glow-sparkles-container';
    container.className = 'glow-sparkles-container';
    document.body.appendChild(container);

    const icons = ['fa-star', 'fa-asterisk', 'fa-bahai', 'fa-certificate'];
    const starCount = 30;

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('i');
      const randomIcon = icons[Math.floor(Math.random() * icons.length)];
      star.className = `fas ${randomIcon} floating-sparkle-star`;
      
      // Random style attributes
      star.style.left = `${Math.random() * 100}vw`;
      
      const size = 5 + Math.random() * 15;
      star.style.fontSize = `${size}px`;
      
      const duration = 6 + Math.random() * 12;
      star.style.animationDuration = `${duration}s`;
      
      const delay = Math.random() * -12; // Start immediately offsetted
      star.style.animationDelay = `${delay}s`;
      
      const opacity = 0.1 + Math.random() * 0.25;
      star.style.opacity = opacity;
      
      container.appendChild(star);
    }
  },

  // Render search results for client order tracking
  renderTrackingResult(order) {
    const container = document.getElementById('tracking-result');
    if (!container) return;

    if (!order) {
      container.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; border: 1px solid var(--border-glass); border-radius: var(--radius-md); background-color: var(--bg-primary); margin-top: 1rem;">
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: var(--color-danger); margin-bottom: 0.5rem;"></i>
          <h4 style="font-weight: 700; color: var(--text-primary);">Código Inválido</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">No encontramos ningún pedido con el código ingresado. Verifique que esté escrito correctamente.</p>
        </div>
      `;
      container.style.display = 'block';
      return;
    }

    const steps = [
      { name: 'Pedido Realizado', key: 'Pendiente', desc: 'Recibimos tu solicitud y está a la espera de confirmación.' },
      { name: 'Aceptado / En Proceso', key: 'En Proceso', desc: 'El vendedor confirmó tu pedido y prepara el stock.' },
      { name: 'Completado / Despachado', key: 'Entregado', desc: 'El producto ha sido despachado, facturado o entregado.' }
    ];

    let currentStepIndex = 0;
    const isCancelled = order.status === 'Cancelado';
    const isPendingStock = order.status === 'Pendiente de Stock';

    if (order.status === 'Pendiente') {
      currentStepIndex = 0;
    } else if (order.status === 'Pendiente de Stock') {
      currentStepIndex = 1;
    } else if (order.status === 'En Proceso') {
      currentStepIndex = 1;
    } else if (['Entregado', 'Facturado', 'Completado (Sin Factura)'].includes(order.status)) {
      currentStepIndex = 2;
    }

    let timelineHtml = '';
    
    if (isCancelled) {
      timelineHtml = `
        <div style="padding: 1rem; border-radius: var(--radius-md); background-color: var(--color-danger-bg); border-left: 4px solid var(--color-danger); display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
          <i class="fas fa-times-circle" style="font-size: 1.5rem; color: var(--color-danger);"></i>
          <div style="text-align: left;">
            <strong style="color: var(--color-danger); font-size: 0.95rem;">Pedido Cancelado</strong>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">Este pedido fue cancelado por el vendedor debido a políticas internas o falta de stock definitivo.</p>
          </div>
        </div>
      `;
    } else if (isPendingStock) {
      timelineHtml = `
        <div style="padding: 1rem; border-radius: var(--radius-md); background-color: var(--color-warning-bg); border-left: 4px solid var(--color-warning); display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
          <i class="fas fa-warehouse" style="font-size: 1.5rem; color: var(--color-warning);"></i>
          <div style="text-align: left;">
            <strong style="color: var(--color-warning); font-size: 0.95rem;">Pendiente de Stock</strong>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">El vendedor está esperando la reposición de stock de los artículos de tu pedido para procesar el envío.</p>
          </div>
        </div>
      `;
    } else {
      // Regular timeline steps
      timelineHtml = `
        <div class="tracking-timeline" style="display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 1.5rem; padding-left: 0.5rem; position: relative; text-align: left;">
          ${steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            
            let iconClass = 'fa-circle';
            let iconColor = 'var(--text-secondary)';
            if (isCompleted) {
              iconClass = 'fa-check-circle';
              iconColor = 'var(--color-success)';
            }
            if (isCurrent && !isCompleted) {
              iconClass = 'fa-clock';
              iconColor = 'var(--color-warning)';
            }

            return `
              <div style="display: flex; gap: 1rem; position: relative;">
                <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2;">
                  <i class="fas ${iconClass}" style="color: ${iconColor}; font-size: 1.25rem; background-color: var(--bg-secondary); border-radius: 50%;"></i>
                </div>
                <div>
                  <h4 style="font-weight: 700; font-size: 0.95rem; color: ${isCompleted ? 'var(--text-primary)' : 'var(--text-secondary)'};">${step.name}</h4>
                  <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">${step.desc}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 3px;">
        <span>${item.name}</span>
        <span>${this.formatCurrency(item.price)}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="border-top: 1px dashed var(--border-glass); padding-top: 1.5rem; margin-top: 1rem; text-align: left;">
        <h4 style="font-weight: 800; font-size: 1.1rem; margin-bottom: 1rem; color: var(--text-primary);">Detalles de la Compra</h4>
        
        <!-- Timeline -->
        ${timelineHtml}
        
        <div class="glass-panel" style="padding: 1rem; font-size: 0.9rem; text-align: left;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 700; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem;">
            <span>Código de Pedido:</span>
            <span style="color: var(--accent-color);">${order.id}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span>Cliente:</span>
            <span>${order.customerName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span>Fecha:</span>
            <span>${this.formatDate(order.date)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px dashed var(--border-glass); padding-bottom: 0.5rem;">
            <span>Estado Actual:</span>
            <strong style="color: ${isCancelled ? 'var(--color-danger)' : isPendingStock ? 'var(--color-warning)' : 'var(--color-success)'};">${order.status}</strong>
          </div>
          
          <div style="margin-bottom: 0.75rem;">
            <strong style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">Artículos:</strong>
            ${itemsHtml}
          </div>
          
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.05rem; border-top: 1px solid var(--border-glass); padding-top: 0.5rem;">
            <span>Total:</span>
            <span>${this.formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    `;

    container.style.display = 'block';
  }
};

window.UI = UI;
