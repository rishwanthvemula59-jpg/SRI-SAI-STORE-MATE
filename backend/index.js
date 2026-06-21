const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ==========================================
// 1. CUSTOMERS & LEDGER ENDPOINTS
// ==========================================

// Get all customers with balances and oldest debit dates
app.get('/api/customers', (req, res) => {
  const query = `
    SELECT 
      c.id, 
      c.name, 
      c.phone, 
      c.created_at, 
      c.updated_at,
      COALESCE(SUM(CASE WHEN l.type = 'debit' THEN l.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN l.type = 'credit' THEN l.amount ELSE 0 END), 0) AS balance,
      MIN(CASE WHEN l.type = 'debit' THEN l.date END) AS oldest_debit_date
    FROM customers c
    LEFT JOIN ledger l ON c.id = l.customer_id
    GROUP BY c.id
    ORDER BY c.name ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(rows);
  });
});

// Get a single customer with their ledger history
app.get('/api/customers/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM customers WHERE id = ?', [id], (err, customer) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Database query failed' });
    }
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get ledger details
    db.all(
      'SELECT * FROM ledger WHERE customer_id = ? ORDER BY date DESC, id DESC',
      [id],
      (err, ledger) => {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ error: 'Database query failed' });
        }

        // Calculate running balance
        let balance = 0;
        ledger.forEach(entry => {
          if (entry.type === 'debit') {
            balance += entry.amount;
          } else {
            balance -= entry.amount;
          }
        });

        res.json({
          ...customer,
          balance,
          ledger
        });
      }
    );
  });
});

// Create a new customer
app.post('/api/customers', (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and 10-digit phone number are required' });
  }

  if (phone.length !== 10 || !/^\d+$/.test(phone)) {
    return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
  }

  const query = 'INSERT INTO customers (name, phone) VALUES (?, ?)';
  db.run(query, [name, phone], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'A customer with this phone number already exists' });
      }
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to create customer' });
    }
    
    res.status(201).json({
      id: this.lastID,
      name,
      phone,
      balance: 0,
      oldest_debit_date: null
    });
  });
});

// Add a ledger entry (debit or credit)
app.post('/api/customers/:id/ledger', (req, res) => {
  const { id } = req.params;
  const { type, amount, note, date, due_date } = req.body;

  if (!type || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Type (debit/credit) and positive amount are required' });
  }

  if (type !== 'debit' && type !== 'credit') {
    return res.status(400).json({ error: 'Type must be either "debit" or "credit"' });
  }

  // Verify customer exists
  db.get('SELECT id FROM customers WHERE id = ?', [id], (err, customer) => {
    if (err) {
      return res.status(500).json({ error: 'Database verification failed' });
    }
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const entryDate = date || new Date().toISOString().split('T')[0];
    const query = 'INSERT INTO ledger (customer_id, type, amount, note, date, due_date) VALUES (?, ?, ?, ?, ?, ?)';
    
    db.run(query, [id, type, amount, note || '', entryDate, due_date || null], function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to add ledger entry' });
      }

      // Update the customer updated_at timestamp
      db.run('UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

      res.status(201).json({
        id: this.lastID,
        customer_id: parseInt(id),
        type,
        amount,
        note: note || '',
        date: entryDate,
        due_date: due_date || null
      });
    });
  });
});

// Get recent transactions across all customers
app.get('/api/ledger/recent', (req, res) => {
  const query = `
    SELECT 
      l.id,
      l.customer_id,
      l.type,
      l.amount,
      l.note,
      l.date,
      l.due_date,
      l.created_at,
      c.name AS customer_name
    FROM ledger l
    JOIN customers c ON l.customer_id = c.id
    ORDER BY l.date DESC, l.id DESC
    LIMIT 5
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to fetch recent transactions' });
    }
    res.json(rows);
  });
});

// Get monthly ledger summary for the last 6 months
app.get('/api/ledger/summary', (req, res) => {
  const query = `
    SELECT 
      strftime('%Y-%m', date) AS month,
      SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS total_debit,
      SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_credit
    FROM ledger
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to fetch ledger summary' });
    }
    res.json(rows.reverse());
  });
});

// Edit a ledger entry
app.put('/api/ledger/:id', (req, res) => {
  const { id } = req.params;
  const { amount, note, date, due_date } = req.body;

  if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  db.get('SELECT customer_id FROM ledger WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve ledger entry' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    const customerId = row.customer_id;
    let fields = [];
    let params = [];

    if (amount !== undefined) {
      fields.push('amount = ?');
      params.push(amount);
    }
    if (note !== undefined) {
      fields.push('note = ?');
      params.push(note);
    }
    if (date !== undefined) {
      fields.push('date = ?');
      params.push(date);
    }
    if (due_date !== undefined) {
      fields.push('due_date = ?');
      params.push(due_date);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE ledger SET ${fields.join(', ')} WHERE id = ?`;

    db.run(query, params, function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to update ledger entry' });
      }

      db.run('UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [customerId]);
      res.json({ message: 'Ledger entry updated successfully' });
    });
  });
});

// Delete a ledger entry
app.delete('/api/ledger/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT customer_id FROM ledger WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve ledger entry' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    const customerId = row.customer_id;

    db.run('DELETE FROM ledger WHERE id = ?', [id], function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to delete ledger entry' });
      }

      db.run('UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [customerId]);
      res.json({ message: 'Ledger entry deleted successfully' });
    });
  });
});

// Delete a customer
app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to delete customer' });
    }
    res.json({ message: 'Customer deleted successfully', changes: this.changes });
  });
});


// ==========================================
// 2. SUPPLIERS ENDPOINTS
// ==========================================

// Get all suppliers
app.get('/api/suppliers', (req, res) => {
  db.all('SELECT * FROM suppliers ORDER BY name ASC', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to get suppliers' });
    }
    res.json(rows);
  });
});

// Create a new supplier
app.post('/api/suppliers', (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Supplier name and phone number are required' });
  }

  db.run('INSERT INTO suppliers (name, phone) VALUES (?, ?)', [name, phone], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to create supplier' });
    }
    res.status(201).json({
      id: this.lastID,
      name,
      phone
    });
  });
});

// Delete a supplier
app.delete('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM suppliers WHERE id = ?', [id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to delete supplier' });
    }
    res.json({ message: 'Supplier deleted successfully', changes: this.changes });
  });
});


// ==========================================
// 3. ORDERS ENDPOINTS
// ==========================================

// Get all orders (with supplier details)
app.get('/api/orders', (req, res) => {
  const query = `
    SELECT 
      o.*, 
      s.name AS supplier_name, 
      s.phone AS supplier_phone
    FROM orders o
    LEFT JOIN suppliers s ON o.supplier_id = s.id
    ORDER BY o.status ASC, o.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
    res.json(rows);
  });
});

// Create a single order
app.post('/api/orders', (req, res) => {
  const { medicine_name, qty, unit, priority, supplier_id } = req.body;

  if (!medicine_name || !qty || !unit || !supplier_id) {
    return res.status(400).json({ error: 'Medicine name, quantity, unit, and supplier are required' });
  }

  const query = `
    INSERT INTO orders (medicine_name, qty, unit, priority, supplier_id, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `;

  db.run(query, [medicine_name, qty, unit, priority || 'normal', supplier_id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to create order' });
    }
    
    // Fetch the newly created order with supplier name
    const orderId = this.lastID;
    const selectQuery = `
      SELECT o.*, s.name as supplier_name, s.phone as supplier_phone
      FROM orders o
      LEFT JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.id = ?
    `;
    db.get(selectQuery, [orderId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve new order details' });
      }
      res.status(201).json(row);
    });
  });
});

// Confirm multiple draft orders (bulk insert)
app.post('/api/orders/bulk-confirm', (req, res) => {
  const { items } = req.body; // Array of { medicine_name, qty, unit, priority, supplier_id }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const stmt = db.prepare(`
      INSERT INTO orders (medicine_name, qty, unit, priority, supplier_id, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `);

    let hasError = false;
    items.forEach(item => {
      stmt.run([
        item.medicine_name,
        item.qty,
        item.unit,
        item.priority || 'normal',
        item.supplier_id
      ], (err) => {
        if (err) {
          console.error('Bulk order error:', err.message);
          hasError = true;
        }
      });
    });

    stmt.finalize((err) => {
      if (err || hasError) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to commit bulk orders transaction' });
      }
      
      db.run('COMMIT', (commitErr) => {
        if (commitErr) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to commit transaction' });
        }
        res.json({ message: 'All orders confirmed successfully', count: items.length });
      });
    });
  });
});

// Update order status (pending -> ordered -> received) or edit it
app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status, medicine_name, qty, unit, priority, supplier_id } = req.body;

  let updateFields = [];
  let params = [];

  if (status) {
    updateFields.push('status = ?');
    params.push(status);
  }
  if (medicine_name) {
    updateFields.push('medicine_name = ?');
    params.push(medicine_name);
  }
  if (qty !== undefined) {
    updateFields.push('qty = ?');
    params.push(qty);
  }
  if (unit) {
    updateFields.push('unit = ?');
    params.push(unit);
  }
  if (priority) {
    updateFields.push('priority = ?');
    params.push(priority);
  }
  if (supplier_id) {
    updateFields.push('supplier_id = ?');
    params.push(supplier_id);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const query = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;

  db.run(query, params, function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to update order' });
    }
    
    // Fetch updated order
    const selectQuery = `
      SELECT o.*, s.name as supplier_name, s.phone as supplier_phone
      FROM orders o
      LEFT JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.id = ?
    `;
    db.get(selectQuery, [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve updated order' });
      }
      res.json(row);
    });
  });
});

// Mark all pending orders for a supplier as ordered
app.post('/api/orders/mark-ordered', (req, res) => {
  const { supplier_id } = req.body;

  if (!supplier_id) {
    return res.status(400).json({ error: 'Supplier ID is required' });
  }

  const query = `
    UPDATE orders 
    SET status = 'ordered', updated_at = CURRENT_TIMESTAMP 
    WHERE supplier_id = ? AND status = 'pending'
  `;

  db.run(query, [supplier_id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to update orders to ordered' });
    }
    res.json({ message: 'Orders marked as ordered successfully', count: this.changes });
  });
});

// Delete an order
app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM orders WHERE id = ?', [id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to delete order' });
    }
    res.json({ message: 'Order deleted successfully', changes: this.changes });
  });
});

const path = require('path');

// Serve static frontend assets in production mode
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  
  // Catch-all route to serve the React SPA index.html for clientside routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
