const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize in-memory SQLite database
const db = new Database(':memory:');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    due_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert some initial data
const initialItems = ['Item 1', 'Item 2', 'Item 3'];
const insertStmt = db.prepare('INSERT INTO items (name, due_date) VALUES (?, ?)');

const isValidDueDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const parsedDate = Date.parse(value);
  return Number.isFinite(parsedDate);
};

initialItems.forEach(item => {
  insertStmt.run(item, null);
});

console.log('In-memory database initialized with sample data');

// API Routes
app.get('/api/items', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM items ORDER BY name DESC, id DESC').all();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const { name, due_date: dueDate } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    if (!isValidDueDate(dueDate)) {
      return res.status(400).json({ error: 'Due date must be a valid date string' });
    }

    const normalizedDueDate = dueDate || null;
    const result = insertStmt.run(name.trim(), normalizedDueDate);
    const id = result.lastInsertRowid;

    const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid item ID is required' });
    }

    const existingItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const deleteStmt = db.prepare('DELETE FROM items WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes > 0) {
      res.json({ message: 'Item deleted successfully', id: parseInt(id) });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = { app, db, insertStmt };