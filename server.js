const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: Object.create(null) });
}

// Data Helper Functions
function readJsonFile(filename, defaultData = []) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return defaultData;
  }
}

function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
    return false;
  }
}

// MIME Types Map
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Request Body Parser Helper
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Helper for JSON response
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  };

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // API ROUTES
  if (pathname.startsWith('/api/')) {
    
    // --- INVENTORY API ---
    if (pathname === '/api/inventory') {
      if (method === 'GET') {
        const inventory = readJsonFile('inventory.json');
        return sendJson(200, { success: true, data: inventory });
      }
      if (method === 'POST') {
        try {
          const body = await getRequestBody(req);
          const inventory = readJsonFile('inventory.json');
          const newItem = {
            id: 'inv_' + Date.now(),
            name: body.name || 'Unnamed Item',
            category: body.category || 'General',
            quantity: Number(body.quantity) || 1,
            unit: body.unit || 'Items',
            location: body.location || 'Pantry',
            purchaseDate: body.purchaseDate || new Date().toISOString().split('T')[0],
            expiryDate: body.expiryDate || new Date().toISOString().split('T')[0],
            status: body.status || 'fresh',
            notes: body.notes || ''
          };
          inventory.unshift(newItem);
          writeJsonFile('inventory.json', inventory);
          return sendJson(201, { success: true, data: newItem });
        } catch (err) {
          return sendJson(400, { success: false, message: 'Invalid payload' });
        }
      }
    }

    if (pathname.startsWith('/api/inventory/')) {
      const parts = pathname.split('/');
      const itemId = parts[3];
      const subAction = parts[4];

      if (itemId && !subAction) {
        if (method === 'PUT') {
          try {
            const body = await getRequestBody(req);
            const inventory = readJsonFile('inventory.json');
            const idx = inventory.findIndex(item => item.id === itemId);
            if (idx === -1) return sendJson(404, { success: false, message: 'Item not found' });
            
            inventory[idx] = { ...inventory[idx], ...body };
            writeJsonFile('inventory.json', inventory);
            return sendJson(200, { success: true, data: inventory[idx] });
          } catch (err) {
            return sendJson(400, { success: false, message: 'Invalid payload' });
          }
        }
        if (method === 'DELETE') {
          let inventory = readJsonFile('inventory.json');
          const initialLength = inventory.length;
          inventory = inventory.filter(item => item.id !== itemId);
          if (inventory.length === initialLength) {
            return sendJson(404, { success: false, message: 'Item not found' });
          }
          writeJsonFile('inventory.json', inventory);
          return sendJson(200, { success: true, message: 'Item deleted' });
        }
      }

      // Convert Item to Donation
      if (itemId && subAction === 'donate' && method === 'POST') {
        let inventory = readJsonFile('inventory.json');
        const item = inventory.find(i => i.id === itemId);
        if (!item) return sendJson(404, { success: false, message: 'Item not found' });

        // Remove from inventory
        inventory = inventory.filter(i => i.id !== itemId);
        writeJsonFile('inventory.json', inventory);

        // Add to donations
        const donations = readJsonFile('donations.json');
        const newDonation = {
          id: 'don_' + Date.now(),
          itemName: item.name + ` (${item.quantity} ${item.unit})`,
          donorName: 'Hybrid Kitchen Manager',
          donorType: 'Kitchen User',
          quantity: `${item.quantity} ${item.unit}`,
          pickupLocation: 'Main Kitchen Desk, Room 102',
          pickupWindow: 'Today, Next 4 Hours',
          expiryHours: 12,
          postedAt: new Date().toISOString(),
          status: 'available',
          claimCode: null,
          claimedBy: null
        };
        donations.unshift(newDonation);
        writeJsonFile('donations.json', donations);

        return sendJson(200, { success: true, data: newDonation, message: 'Moved to Surplus Donation board' });
      }
    }

    // --- SURPLUS DONATIONS API ---
    if (pathname === '/api/donations') {
      if (method === 'GET') {
        const donations = readJsonFile('donations.json');
        return sendJson(200, { success: true, data: donations });
      }
      if (method === 'POST') {
        try {
          const body = await getRequestBody(req);
          const donations = readJsonFile('donations.json');
          const newDonation = {
            id: 'don_' + Date.now(),
            itemName: body.itemName || 'Surplus Pack',
            donorName: body.donorName || 'Community Member',
            donorType: body.donorType || 'Individual',
            quantity: body.quantity || '1 Item',
            pickupLocation: body.pickupLocation || 'Community Pick-up Hub',
            pickupWindow: body.pickupWindow || 'Today, 2 PM - 6 PM',
            expiryHours: Number(body.expiryHours) || 12,
            postedAt: new Date().toISOString(),
            status: 'available',
            claimCode: null,
            claimedBy: null
          };
          donations.unshift(newDonation);
          writeJsonFile('donations.json', donations);
          return sendJson(201, { success: true, data: newDonation });
        } catch (err) {
          return sendJson(400, { success: false, message: 'Invalid payload' });
        }
      }
    }

    if (pathname.startsWith('/api/donations/') && pathname.endsWith('/claim') && method === 'POST') {
      const parts = pathname.split('/');
      const donationId = parts[3];
      try {
        const body = await getRequestBody(req);
        const donations = readJsonFile('donations.json');
        const donation = donations.find(d => d.id === donationId);
        if (!donation) return sendJson(404, { success: false, message: 'Donation not found' });
        if (donation.status === 'claimed') {
          return sendJson(400, { success: false, message: 'Item already claimed' });
        }

        const claimCode = 'CLAIM-' + Math.floor(1000 + Math.random() * 9000);
        donation.status = 'claimed';
        donation.claimCode = claimCode;
        donation.claimedBy = body.claimedBy || 'Community Beneficiary / NGO';

        writeJsonFile('donations.json', donations);
        return sendJson(200, { success: true, data: donation, claimCode });
      } catch (err) {
        return sendJson(400, { success: false, message: 'Claim failed' });
      }
    }

    // --- ORDERS & MENU API ---
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        const orders = readJsonFile('orders.json');
        return sendJson(200, { success: true, data: orders });
      }
      if (method === 'POST') {
        try {
          const body = await getRequestBody(req);
          const orders = readJsonFile('orders.json');
          const newOrder = {
            id: 'ord_' + Date.now(),
            customerName: body.customerName || 'Walk-in Customer',
            items: body.items || [],
            totalAmount: Number(body.totalAmount) || 0,
            status: 'preparing',
            createdAt: new Date().toISOString(),
            pickupType: body.pickupType || 'Express Pickup'
          };
          orders.unshift(newOrder);
          writeJsonFile('orders.json', orders);
          return sendJson(201, { success: true, data: newOrder });
        } catch (err) {
          return sendJson(400, { success: false, message: 'Invalid order' });
        }
      }
    }

    if (pathname.startsWith('/api/orders/') && pathname.endsWith('/status') && method === 'PUT') {
      const parts = pathname.split('/');
      const orderId = parts[3];
      try {
        const body = await getRequestBody(req);
        const orders = readJsonFile('orders.json');
        const order = orders.find(o => o.id === orderId);
        if (!order) return sendJson(404, { success: false, message: 'Order not found' });

        order.status = body.status || order.status;
        writeJsonFile('orders.json', orders);
        return sendJson(200, { success: true, data: order });
      } catch (err) {
        return sendJson(400, { success: false, message: 'Update failed' });
      }
    }

    // --- ANALYTICS SUMMARY API ---
    if (pathname === '/api/analytics' && method === 'GET') {
      const inventory = readJsonFile('inventory.json');
      const donations = readJsonFile('donations.json');
      const orders = readJsonFile('orders.json');

      const totalItems = inventory.length;
      const criticalCount = inventory.filter(i => i.status === 'critical').length;
      const warningCount = inventory.filter(i => i.status === 'warning').length;
      const freshCount = inventory.filter(i => i.status === 'fresh').length;

      const totalDonations = donations.length;
      const claimedDonations = donations.filter(d => d.status === 'claimed').length;
      const totalOrders = orders.length;

      // Estimated Waste Saved (kg) & Carbon Impact (kg CO2e)
      const estimatedSavedKg = (claimedDonations * 2.5) + (freshCount * 0.8) + (totalOrders * 0.5);
      const estimatedCo2Saved = (estimatedSavedKg * 2.1).toFixed(1);
      const estimatedMoneySaved = (estimatedSavedKg * 4.5).toFixed(2);

      return sendJson(200, {
        success: true,
        data: {
          inventoryStats: { totalItems, freshCount, warningCount, criticalCount },
          donationStats: { totalDonations, claimedDonations },
          orderStats: { totalOrders },
          ecoImpact: {
            wasteSavedKg: estimatedSavedKg.toFixed(1),
            co2SavedKg: estimatedCo2Saved,
            moneySavedUsd: estimatedMoneySaved
          }
        }
      });
    }

    return sendJson(404, { success: false, message: 'Endpoint not found' });
  }

  // STATIC FILE SERVER
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing if needed
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500);
        return res.end('Server Error');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    });
  });
});

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  🍏 Food Management System Server Running`);
  console.log(`  🌐 Local URL: http://localhost:${PORT}`);
  console.log(`  📁 Storage: Zero-DB JSON Files in ${DATA_DIR}`);
  console.log(`===================================================`);
});
