const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_CWQosN8S1RqX@ep-square-poetry-a1u8yqpw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

// Root route for debugging
app.get('/', (req, res) => {
  res.status(200).send('Bistro 92 Backend is running');
});

// GET all orders
app.get('/api/orders', async (req, res) => {
  try {
    console.log('GET /api/orders called');
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100');
    res.status(200).json({ orders: result.rows });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST a new order
app.post('/api/orders', async (req, res) => {
  const { table_number, items } = req.body;

  if (!table_number || !items) {
    return res.status(400).json({ error: 'Table number and items are required' });
  }

  try {
    console.log('POST /api/orders called:', req.body);
    const result = await pool.query(
      'INSERT INTO orders (table_number, items) VALUES ($1, $2) RETURNING *',
      [table_number, items]
    );
    res.status(201).json({
      message: 'Order inserted successfully',
      order: result.rows[0],
    });
  } catch (error) {
    console.error('Error inserting order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// // DELETE an order by ID
// app.delete('/api/orders/:id', async (req, res) => {
//   const { id } = req.params;

//   try {
//     console.log(`DELETE /api/orders/${id} called`);
//     const result = await pool.query('DELETE FROM orders WHERE order_id = $1 RETURNING *', [id]);
//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
//     res.status(200).json({ message: 'Order deleted successfully', order: result.rows[0] });
//   } catch (error) {
//     console.error('Error deleting order:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});