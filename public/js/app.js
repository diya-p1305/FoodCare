/* ==========================================================================
   Food Management System - Interactive Frontend Application State & Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // App State
  const state = {
    inventory: [],
    donations: [],
    orders: [],
    analytics: null,
    userMode: 'household', // household, vendor, ngo
    activeTab: 'dashboard',
    searchQuery: '',
    categoryFilter: 'all'
  };

  // Pre-calculated Zero-Waste Recipe Database
  const recipeDatabase = [
    {
      id: 'rec_1',
      title: 'French Toast & Caramelized Apples',
      prepTime: '15 mins',
      difficulty: 'Easy',
      matchedCategories: ['Bakery', 'Produce', 'Dairy'],
      ingredients: ['Whole Grain Bread', 'Organic Apples', 'Fresh Milk'],
      description: 'The perfect dish to revive slightly stale bread and aging apples before they spoil.'
    },
    {
      id: 'rec_2',
      title: 'Creamy Vegetable & Herb Soup',
      prepTime: '25 mins',
      difficulty: 'Easy',
      matchedCategories: ['Produce', 'Dairy'],
      ingredients: ['Tomatoes', 'Bell Peppers', 'Greek Yogurt'],
      description: 'Simmer aging tomatoes and peppers with yogurt for a rich, comforting zero-waste soup.'
    },
    {
      id: 'rec_3',
      title: 'Crispy Grilled Chicken & Cheese Sandwich',
      prepTime: '20 mins',
      difficulty: 'Medium',
      matchedCategories: ['Meat', 'Bakery', 'Dairy'],
      ingredients: ['Chicken Breast', 'Whole Grain Bread', 'Milk'],
      description: 'Utilize cooked chicken breasts and bakery slices for a high-protein quick meal.'
    }
  ];

  // DOM Elements
  const elements = {
    tabs: document.querySelectorAll('.tab-btn'),
    panels: document.querySelectorAll('.tab-panel'),
    userModeSelect: document.getElementById('userModeSelect'),
    
    // Metrics
    metricTotalItems: document.getElementById('metricTotalItems'),
    metricExpiringCount: document.getElementById('metricExpiringCount'),
    metricDonationsCount: document.getElementById('metricDonationsCount'),
    metricCo2Saved: document.getElementById('metricCo2Saved'),

    // Containers
    dashboardExpiringList: document.getElementById('dashboardExpiringList'),
    inventoryGrid: document.getElementById('inventoryGrid'),
    donationsGrid: document.getElementById('donationsGrid'),
    recipesGrid: document.getElementById('recipesGrid'),
    menuGrid: document.getElementById('menuGrid'),
    ordersList: document.getElementById('ordersList'),

    // Modals & Forms
    addInventoryModal: document.getElementById('addInventoryModal'),
    openAddInventoryBtn: document.getElementById('openAddInventoryBtn'),
    openAddInventoryModalBtn: document.getElementById('openAddInventoryModalBtn'),
    closeAddInventoryModal: document.getElementById('closeAddInventoryModal'),
    addInventoryForm: document.getElementById('addInventoryForm'),

    postDonationModal: document.getElementById('postDonationModal'),
    openPostDonationBtn: document.getElementById('openPostDonationBtn'),
    closePostDonationModal: document.getElementById('closePostDonationModal'),
    postDonationForm: document.getElementById('postDonationForm'),

    // Filters & Search
    inventorySearch: document.getElementById('inventorySearch'),
    inventoryCategoryFilter: document.getElementById('inventoryCategoryFilter'),
    toastContainer: document.getElementById('toastContainer')
  };

  // Toast Notification Helper
  function showToast(message, icon = '✅') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // API Call Helper with LocalStorage Fallback
  async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) options.body = JSON.stringify(body);

      const res = await fetch(endpoint, options);
      if (!res.ok) throw new Error('API server returned error');
      const json = await res.json();
      return json.data || json;
    } catch (err) {
      console.warn(`API call to ${endpoint} failed. Using LocalStorage fallback mode.`);
      return handleLocalStorageFallback(endpoint, method, body);
    }
  }

  // LocalStorage Fallback Logic
  function handleLocalStorageFallback(endpoint, method, body) {
    const key = endpoint.split('?')[0].replace('/api/', '');

    if (key === 'inventory') {
      let inv = JSON.parse(localStorage.getItem('fms_inventory')) || [
        { id: 'inv_1', name: 'Fresh Milk (1L)', category: 'Dairy', quantity: 2, unit: 'Liters', location: 'Fridge', expiryDate: getOffsetDate(2), status: 'warning', notes: 'Keep chilled' },
        { id: 'inv_2', name: 'Whole Grain Bread', category: 'Bakery', quantity: 1, unit: 'Loaf', location: 'Pantry', expiryDate: getOffsetDate(1), status: 'critical', notes: 'Toast or donate' },
        { id: 'inv_3', name: 'Red Apples', category: 'Produce', quantity: 8, unit: 'Items', location: 'Pantry', expiryDate: getOffsetDate(10), status: 'fresh', notes: 'Juicy' }
      ];
      if (method === 'POST') {
        const newItem = { id: 'inv_' + Date.now(), ...body };
        inv.unshift(newItem);
        localStorage.setItem('fms_inventory', JSON.stringify(inv));
        return newItem;
      }
      localStorage.setItem('fms_inventory', JSON.stringify(inv));
      return inv;
    }

    if (key === 'donations') {
      let don = JSON.parse(localStorage.getItem('fms_donations')) || [
        { id: 'don_1', itemName: 'Fresh Bakery Pastries (10 Packets)', donorName: 'GreenLeaf Cafe', donorType: 'Vendor', quantity: '10 Packs', pickupLocation: '742 Evergreen Terrace', pickupWindow: 'Today 5-8 PM', expiryHours: 6, status: 'available' },
        { id: 'don_2', itemName: 'Organic Tomatoes', donorName: 'Community Garden', donorType: 'Individual', quantity: '4 kg', pickupLocation: '104 Maple St', pickupWindow: 'Today 4-7 PM', expiryHours: 12, status: 'available' }
      ];
      if (method === 'POST') {
        const newDon = { id: 'don_' + Date.now(), status: 'available', ...body };
        don.unshift(newDon);
        localStorage.setItem('fms_donations', JSON.stringify(don));
        return newDon;
      }
      localStorage.setItem('fms_donations', JSON.stringify(don));
      return don;
    }

    if (key === 'orders') {
      let ord = JSON.parse(localStorage.getItem('fms_orders')) || [
        { id: 'ord_1', customerName: 'Alex Morgan', items: [{ name: 'Fresh Salad', qty: 1, price: 8.00 }], totalAmount: 8.00, status: 'ready', pickupType: 'Express' }
      ];
      if (method === 'POST') {
        const newOrd = { id: 'ord_' + Date.now(), status: 'preparing', ...body };
        ord.unshift(newOrd);
        localStorage.setItem('fms_orders', JSON.stringify(ord));
        return newOrd;
      }
      localStorage.setItem('fms_orders', JSON.stringify(ord));
      return ord;
    }

    if (key === 'analytics') {
      const inv = JSON.parse(localStorage.getItem('fms_inventory')) || [];
      const don = JSON.parse(localStorage.getItem('fms_donations')) || [];
      return {
        inventoryStats: { totalItems: inv.length, freshCount: inv.length, warningCount: 1, criticalCount: 1 },
        donationStats: { totalDonations: don.length, claimedDonations: 1 },
        ecoImpact: { wasteSavedKg: '18.5', co2SavedKg: '38.8', moneySavedUsd: '83.25' }
      };
    }

    return [];
  }

  function getOffsetDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }

  // Calculate Expiry Status Badge
  function getExpiryStatus(expiryDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDateStr);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return { label: 'Critical (1 Day)', class: 'badge-critical', diffDays };
    if (diffDays <= 4) return { label: `Use Soon (${diffDays} Days)`, class: 'badge-warning', diffDays };
    return { label: `Fresh (${diffDays} Days Left)`, class: 'badge-fresh', diffDays };
  }

  // Initial Load
  async function loadData() {
    state.inventory = await apiRequest('/api/inventory');
    state.donations = await apiRequest('/api/donations');
    state.orders = await apiRequest('/api/orders');
    state.analytics = await apiRequest('/api/analytics');

    renderAll();
  }

  // Render All Views
  function renderAll() {
    renderMetrics();
    renderDashboard();
    renderInventory();
    renderDonations();
    renderRecipes();
    renderMenuAndOrders();
    renderAnalytics();
  }

  // Render Top Metric Cards
  function renderMetrics() {
    const totalItems = state.inventory.length;
    const expiringCount = state.inventory.filter(i => {
      const status = getExpiryStatus(i.expiryDate);
      return status.diffDays <= 3;
    }).length;
    const availableDonations = state.donations.filter(d => d.status === 'available').length;

    elements.metricTotalItems.textContent = totalItems;
    elements.metricExpiringCount.textContent = expiringCount;
    elements.metricDonationsCount.textContent = availableDonations;

    const co2 = state.analytics && state.analytics.ecoImpact ? state.analytics.ecoImpact.co2SavedKg : (expiringCount * 2.1 + 14.5).toFixed(1);
    elements.metricCo2Saved.textContent = `${co2} kg`;
  }

  // Render Dashboard
  function renderDashboard() {
    elements.dashboardExpiringList.innerHTML = '';

    const urgentItems = state.inventory.filter(i => {
      const status = getExpiryStatus(i.expiryDate);
      return status.diffDays <= 4;
    });

    if (urgentItems.length === 0) {
      elements.dashboardExpiringList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted);">
          🎉 Great job! No items are near expiration right now.
        </div>`;
      return;
    }

    urgentItems.forEach(item => {
      const status = getExpiryStatus(item.expiryDate);
      const card = createFoodCard(item, status);
      elements.dashboardExpiringList.appendChild(card);
    });
  }

  // Create Standard Inventory Food Card
  function createFoodCard(item, status) {
    const card = document.createElement('div');
    card.className = 'food-card';
    card.innerHTML = `
      <div>
        <div class="card-top">
          <div>
            <h3 class="card-title">${item.name}</h3>
            <span class="card-category">📍 ${item.location} • ${item.category}</span>
          </div>
          <span class="badge-status ${status.class}">${status.label}</span>
        </div>
        <div class="card-details">
          <div class="detail-row">
            <span>Quantity:</span>
            <strong style="color: var(--text-main);">${item.quantity} ${item.unit}</strong>
          </div>
          <div class="detail-row">
            <span>Expires:</span>
            <strong style="color: var(--text-main);">${item.expiryDate}</strong>
          </div>
          ${item.notes ? `<div style="font-size:0.8rem; font-style:italic; margin-top:4px;">"${item.notes}"</div>` : ''}
        </div>
      </div>
      <div class="card-actions">
        <button class="btn-secondary use-btn" style="flex:1;">✔️ Used 1</button>
        <button class="btn-primary donate-btn" style="flex:1.2; font-size:0.8rem;">🤝 Donate</button>
        <button class="btn-danger delete-btn">🗑️</button>
      </div>
    `;

    // Event Handlers
    card.querySelector('.use-btn').addEventListener('click', () => decrementItemQuantity(item.id));
    card.querySelector('.donate-btn').addEventListener('click', () => convertToDonation(item.id));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteInventoryItem(item.id));

    return card;
  }

  // Render Inventory Tab
  function renderInventory() {
    elements.inventoryGrid.innerHTML = '';

    let filtered = state.inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(state.searchQuery.toLowerCase());
      const matchesCategory = state.categoryFilter === 'all' || item.category === state.categoryFilter;
      return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
      elements.inventoryGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          No items found. Click "+ Add Item" to populate your inventory.
        </div>`;
      return;
    }

    filtered.forEach(item => {
      const status = getExpiryStatus(item.expiryDate);
      const card = createFoodCard(item, status);
      elements.inventoryGrid.appendChild(card);
    });
  }

  // Item Actions
  async function decrementItemQuantity(id) {
    const item = state.inventory.find(i => i.id === id);
    if (!item) return;

    if (item.quantity > 1) {
      item.quantity -= 1;
      await apiRequest(`/api/inventory/${id}`, 'PUT', { quantity: item.quantity });
      showToast(`Updated ${item.name} quantity to ${item.quantity}`);
    } else {
      await deleteInventoryItem(id);
    }
    loadData();
  }

  async function convertToDonation(id) {
    const res = await apiRequest(`/api/inventory/${id}/donate`, 'POST');
    showToast(`Item successfully transferred to Surplus Donation Board! 🤝`, '🎉');
    loadData();
  }

  async function deleteInventoryItem(id) {
    await apiRequest(`/api/inventory/${id}`, 'DELETE');
    showToast(`Item removed from inventory`);
    loadData();
  }

  // Render Surplus Recovery Board
  function renderDonations() {
    elements.donationsGrid.innerHTML = '';

    if (state.donations.length === 0) {
      elements.donationsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          No surplus food posts available right now.
        </div>`;
      return;
    }

    state.donations.forEach(don => {
      const card = document.createElement('div');
      card.className = `food-card donation-card`;
      
      const isClaimed = don.status === 'claimed';

      card.innerHTML = `
        <div>
          <div class="card-top">
            <div>
              <h3 class="card-title">${don.itemName}</h3>
              <span class="card-category">Shared by: ${don.donorName} (${don.donorType || 'Member'})</span>
            </div>
            <span class="timer-tag">${isClaimed ? '✅ Claimed' : '⏱️ ' + (don.expiryHours || 12) + 'h Left'}</span>
          </div>
          <div class="card-details">
            <div class="detail-row">
              <span>Quantity:</span>
              <strong style="color: var(--text-main);">${don.quantity}</strong>
            </div>
            <div class="detail-row">
              <span>Pick-up Location:</span>
              <strong style="color: var(--text-main);">${don.pickupLocation}</strong>
            </div>
            <div class="detail-row">
              <span>Pick-up Window:</span>
              <strong style="color: var(--primary);">${don.pickupWindow}</strong>
            </div>
            ${isClaimed ? `<div style="background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 6px; margin-top: 6px; text-align: center;">
              <strong>Claim Code:</strong> <span style="color: var(--primary); font-family: monospace; font-size: 1.1rem;">${don.claimCode || 'CLAIM-9821'}</span>
            </div>` : ''}
          </div>
        </div>
        <div class="card-actions">
          ${isClaimed ? 
            `<button class="btn-secondary" disabled style="width: 100%; opacity: 0.6;">Reserved by ${don.claimedBy || 'NGO'}</button>` : 
            `<button class="btn-primary claim-btn" style="width: 100%; justify-content: center;">🤝 Claim Free Package</button>`
          }
        </div>
      `;

      if (!isClaimed) {
        card.querySelector('.claim-btn').addEventListener('click', async () => {
          const res = await apiRequest(`/api/donations/${don.id}/claim`, 'POST', { claimedBy: 'Community Recipient' });
          const code = res.claimCode || ('CLAIM-' + Math.floor(1000 + Math.random() * 9000));
          showToast(`Package Claimed! Your code is: ${code}`, '🎟️');
          loadData();
        });
      }

      elements.donationsGrid.appendChild(card);
    });
  }

  // Render Zero-Waste Recipes Matcher
  function renderRecipes() {
    elements.recipesGrid.innerHTML = '';

    recipeDatabase.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'food-card';
      card.innerHTML = `
        <div>
          <div class="card-top">
            <div>
              <h3 class="card-title">${recipe.title}</h3>
              <span class="card-category">⏱️ ${recipe.prepTime} • ${recipe.difficulty}</span>
            </div>
            <span class="badge-status badge-fresh">Zero Waste Recipe</span>
          </div>
          <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 12px;">${recipe.description}</p>
          <div class="card-details">
            <strong style="color: var(--text-main);">Ingredients Used:</strong>
            <ul style="padding-left: 18px; color: var(--text-muted);">
              ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-primary cook-btn" style="width: 100%; justify-content: center;">🍳 Prepare Recipe</button>
        </div>
      `;

      card.querySelector('.cook-btn').addEventListener('click', () => {
        showToast(`Recipe selected! Ingredients reserved from fridge.`, '👨‍🍳');
      });

      elements.recipesGrid.appendChild(card);
    });
  }

  // Render Menu & Orders Pipeline
  function renderMenuAndOrders() {
    elements.menuGrid.innerHTML = '';
    elements.ordersList.innerHTML = '';

    const menuItems = [
      { id: 'm1', name: 'Fresh Farm Green Salad', category: 'Fresh Bowl', price: 7.50 },
      { id: 'm2', name: 'Artisanal Bread & Cheese Platter', category: 'Platter', price: 9.00 },
      { id: 'm3', name: 'Zero-Waste Vegetable Stew', category: 'Hot Meal', price: 6.50 }
    ];

    menuItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'food-card';
      card.innerHTML = `
        <div>
          <h3 class="card-title">${item.name}</h3>
          <span class="card-category">${item.category}</span>
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--primary); margin: 12px 0;">$${item.price.toFixed(2)}</div>
        </div>
        <div class="card-actions">
          <button class="btn-primary buy-btn" style="width: 100%; justify-content: center;">🛒 Place Pickup Order</button>
        </div>
      `;

      card.querySelector('.buy-btn').addEventListener('click', async () => {
        const newOrder = await apiRequest('/api/orders', 'POST', {
          customerName: 'Guest Customer',
          items: [{ name: item.name, qty: 1, price: item.price }],
          totalAmount: item.price,
          pickupType: 'Store Pickup'
        });
        showToast(`Order placed for ${item.name}! Track progress below.`, '🛍️');
        loadData();
      });

      elements.menuGrid.appendChild(card);
    });

    // Render Orders Status Pipeline
    if (state.orders.length === 0) {
      elements.ordersList.innerHTML = `<p style="color:var(--text-muted);">No active orders placed yet.</p>`;
      return;
    }

    state.orders.forEach(ord => {
      const orderBox = document.createElement('div');
      orderBox.style.cssText = 'background: var(--bg-secondary); padding: 14px 18px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-glass);';
      
      let statusColor = 'var(--accent-amber)';
      if (ord.status === 'ready') statusColor = 'var(--primary)';
      if (ord.status === 'completed') statusColor = 'var(--text-muted)';

      orderBox.innerHTML = `
        <div>
          <strong>Order #${ord.id.slice(-4)}</strong> - <span style="color: var(--text-muted);">${ord.customerName}</span>
          <div style="font-size: 0.85rem; color: var(--text-subtle);">$${ord.totalAmount ? ord.totalAmount.toFixed(2) : '8.50'} • ${ord.pickupType || 'Express Pickup'}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-weight: 700; text-transform: uppercase; font-size: 0.8rem; color: ${statusColor};">${ord.status}</span>
          ${ord.status === 'preparing' ? `<button class="btn-secondary mark-ready-btn" style="padding: 4px 10px; font-size: 0.78rem;">Mark Ready</button>` : ''}
        </div>
      `;

      if (ord.status === 'preparing') {
        orderBox.querySelector('.mark-ready-btn').addEventListener('click', async () => {
          await apiRequest(`/api/orders/${ord.id}/status`, 'PUT', { status: 'ready' });
          showToast(`Order #${ord.id.slice(-4)} is Ready for Pick-up!`, '🔔');
          loadData();
        });
      }

      elements.ordersList.appendChild(orderBox);
    });
  }

  // Render Analytics & SVG Chart
  function renderAnalytics() {
    const wasteKg = elements.metricCo2Saved.textContent;
    document.getElementById('analyticsCo2').textContent = wasteKg;
    document.getElementById('analyticsWasteKg').textContent = (parseFloat(wasteKg) * 0.48).toFixed(1) + ' kg';
    document.getElementById('analyticsMoney').textContent = '$' + (parseFloat(wasteKg) * 2.15).toFixed(2);
  }

  // Event Listeners for Tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      state.activeTab = target;

      elements.tabs.forEach(t => t.classList.remove('active'));
      elements.panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
    });
  });

  // Mode Selector Change
  elements.userModeSelect.addEventListener('change', (e) => {
    state.userMode = e.target.value;
    showToast(`Switched operational mode to: ${e.target.options[e.target.selectedIndex].text}`);
  });

  // Search & Filter Listeners
  elements.inventorySearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderInventory();
  });

  elements.inventoryCategoryFilter.addEventListener('change', (e) => {
    state.categoryFilter = e.target.value;
    renderInventory();
  });

  // Modals Open / Close Handlers
  const openModal = (modal) => modal.classList.add('active');
  const closeModal = (modal) => modal.classList.remove('active');

  elements.openAddInventoryBtn.addEventListener('click', () => openModal(elements.addInventoryModal));
  elements.openAddInventoryModalBtn.addEventListener('click', () => openModal(elements.addInventoryModal));
  elements.closeAddInventoryModal.addEventListener('click', () => closeModal(elements.addInventoryModal));

  elements.openPostDonationBtn.addEventListener('click', () => openModal(elements.postDonationModal));
  elements.closePostDonationModal.addEventListener('click', () => closeModal(elements.postDonationModal));

  // Form Submissions
  elements.addInventoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newItem = {
      name: document.getElementById('itemName').value,
      category: document.getElementById('itemCategory').value,
      location: document.getElementById('itemLocation').value,
      quantity: Number(document.getElementById('itemQuantity').value),
      unit: document.getElementById('itemUnit').value,
      expiryDate: document.getElementById('itemExpiry').value,
      notes: document.getElementById('itemNotes').value
    };

    await apiRequest('/api/inventory', 'POST', newItem);
    closeModal(elements.addInventoryModal);
    elements.addInventoryForm.reset();
    showToast(`Added "${newItem.name}" to inventory!`);
    loadData();
  });

  elements.postDonationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newDonation = {
      itemName: document.getElementById('donItemName').value,
      quantity: document.getElementById('donQuantity').value,
      expiryHours: Number(document.getElementById('donExpiryHours').value),
      pickupLocation: document.getElementById('donLocation').value,
      pickupWindow: document.getElementById('donWindow').value,
      donorName: 'Hybrid Kitchen Manager',
      donorType: state.userMode.toUpperCase()
    };

    await apiRequest('/api/donations', 'POST', newDonation);
    closeModal(elements.postDonationModal);
    elements.postDonationForm.reset();
    showToast(`Surplus food published to community board!`);
    loadData();
  });

  // Initial Execution
  loadData();
});
