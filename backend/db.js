const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let dbPath;
if (process.env.DATABASE_PATH) {
  dbPath = process.env.DATABASE_PATH;
} else if (process.env.PERSISTENT_DIR) {
  dbPath = path.join(process.env.PERSISTENT_DIR, 'store_mate.db');
} else if (fs.existsSync('/var/data')) {
  dbPath = '/var/data/store_mate.db';
} else if (fs.existsSync('/data')) {
  dbPath = '/data/store_mate.db';
} else {
  dbPath = path.resolve(__dirname, 'store_mate.db');
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
  }
});

function initDb() {
  db.serialize(() => {
    // 1. Create customers table
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create ledger table
    db.run(`
      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        type TEXT NOT NULL, -- 'debit' (medicine given) or 'credit' (payment received)
        amount REAL NOT NULL,
        note TEXT,
        date TEXT NOT NULL, -- YYYY-MM-DD
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      // Check if due_date column exists
      db.all("PRAGMA table_info(ledger)", (err, columns) => {
        if (!err && columns) {
          const hasDueDate = columns.some(col => col.name === 'due_date');
          if (!hasDueDate) {
            db.run("ALTER TABLE ledger ADD COLUMN due_date TEXT");
          }
        }
      });
    });

    // 3. Create suppliers table
    db.run(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Create orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicine_name TEXT NOT NULL,
        qty REAL NOT NULL,
        unit TEXT NOT NULL, -- 'strips', 'boxes', 'bottles', 'packets', 'tablets'
        priority TEXT DEFAULT 'normal', -- 'urgent' or 'normal'
        supplier_id INTEGER REFERENCES suppliers(id),
        status TEXT DEFAULT 'pending', -- 'pending', 'ordered', 'received'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed Suppliers if empty
    db.get("SELECT COUNT(*) as count FROM suppliers", (err, row) => {
      if (row && row.count === 0) {
        console.log("Seeding suppliers...");
        const stmt = db.prepare("INSERT INTO suppliers (name, phone) VALUES (?, ?)");
        stmt.run("Sai Pharma (Hyderabad)", "9876543210");
        stmt.run("Sri Venkateshwara Distributors", "9440123456");
        stmt.run("Deccan Medical Agency", "9000123456");
        stmt.finalize();
      }
    });

    // Seed Customers & Ledger if empty
    db.get("SELECT COUNT(*) as count FROM customers", (err, row) => {
      if (row && row.count === 0) {
        console.log("Seeding customers and ledger...");

        // Insert Srinivas garu (balance: 450 - 200 = 250, overdue 45 days ago)
        db.run("INSERT INTO customers (name, phone) VALUES (?, ?)", ["Srinivas garu", "9848012345"], function(err) {
          if (err) return console.error(err);
          const customerId = this.lastID;

          const date45DaysAgo = new Date();
          date45DaysAgo.setDate(date45DaysAgo.getDate() - 45);
          const date30DaysAgo = new Date();
          date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);

          db.run("INSERT INTO ledger (customer_id, type, amount, note, date) VALUES (?, 'debit', 450.00, 'Dolo 650, Pantop 40', ?)", [customerId, date45DaysAgo.toISOString().split('T')[0]]);
          db.run("INSERT INTO ledger (customer_id, type, amount, note, date) VALUES (?, 'credit', 200.00, 'Partial cash payment', ?)", [customerId, date30DaysAgo.toISOString().split('T')[0]]);
        });

        // Insert Mallesh garu (balance: 1500, pending 8 days ago)
        db.run("INSERT INTO customers (name, phone) VALUES (?, ?)", ["Mallesh garu", "9848098765"], function(err) {
          if (err) return console.error(err);
          const customerId = this.lastID;

          const date8DaysAgo = new Date();
          date8DaysAgo.setDate(date8DaysAgo.getDate() - 8);

          db.run("INSERT INTO ledger (customer_id, type, amount, note, date) VALUES (?, 'debit', 1500.00, 'Insulin injection, ORS packet, Dolo', ?)", [customerId, date8DaysAgo.toISOString().split('T')[0]]);
        });

        // Insert Anitha garu (balance: 300 - 300 = 0, all clear)
        db.run("INSERT INTO customers (name, phone) VALUES (?, ?)", ["Anitha garu", "9848024680"], function(err) {
          if (err) return console.error(err);
          const customerId = this.lastID;

          const date5DaysAgo = new Date();
          date5DaysAgo.setDate(date5DaysAgo.getDate() - 5);

          db.run("INSERT INTO ledger (customer_id, type, amount, note, date) VALUES (?, 'debit', 300.00, 'Cough syrup, Paracetamol', ?)", [customerId, date5DaysAgo.toISOString().split('T')[0]]);
          db.run("INSERT INTO ledger (customer_id, type, amount, note, date) VALUES (?, 'credit', 300.00, 'Paid full GPay', ?)", [customerId, date5DaysAgo.toISOString().split('T')[0]]);
        });

        // Insert Venkat garu (balance: 850, overdue 35 days ago)
        db.run("INSERT INTO customers (name, phone) VALUES (?, ?)", ["Venkat garu", "9848055443"], function(err) {
          if (err) return console.error(err);
          const customerId = this.lastID;

          const date35DaysAgo = new Date();
          date35DaysAgo.setDate(date35DaysAgo.getDate() - 35);

          db.run("INSERT INTO ledger (customer_id, type, amount, note, date) VALUES (?, 'debit', 850.00, 'Multivitamin capsules', ?)", [customerId, date35DaysAgo.toISOString().split('T')[0]]);
        });
      }
    });

    // Seed Orders if empty
    db.get("SELECT COUNT(*) as count FROM orders", (err, row) => {
      if (row && row.count === 0) {
        console.log("Seeding orders...");
        // Fetch first supplier
        db.get("SELECT id FROM suppliers LIMIT 1", (err, supplierRow) => {
          if (supplierRow) {
            db.run("INSERT INTO orders (medicine_name, qty, unit, priority, supplier_id, status) VALUES ('Dolo 650', 10, 'strips', 'normal', ?, 'pending')", [supplierRow.id]);
            db.run("INSERT INTO orders (medicine_name, qty, unit, priority, supplier_id, status) VALUES ('Pantop 40', 5, 'strips', 'urgent', ?, 'pending')", [supplierRow.id]);
          }
        });
      }
    });
  });
}

initDb();

module.exports = db;
