# Bistro 92 Challenge: Documentation

## Project Overview

The Bistro 92 Smart Ordering System is a full-stack solution designed to enhance customer satisfaction and streamline restaurant operations. It consists of:

- **ESP32 Smart Pad**: A user-friendly ordering device with an SSD1306 OLED display and four push buttons (GPIO 4, 5, 18, 19) for menu navigation, item selection, quantity adjustment, and order submission. The ESP32 sends orders via HTTP POST to a cloud backend.
- **Node.js/Express Backend**: Hosted on Render (`https://bistro-92backend.onrender.com`), it handles POST `/api/orders` for order submission and GET `/api/orders` for retrieving orders, storing data in a Neon PostgreSQL database (`neondb`).
- **Next.js Frontend**: A real-time manager dashboard (`https://github.com/BALLISTICrobin/bistro92frontend.git`) deployed on Vercel, polling GET `/api/orders` every 5 seconds to display a table of orders (`order_id`, `table_number`, `items`, `created_at`).
- **Neon PostgreSQL**: Stores orders in an `orders` table, ensuring reliable data persistence.

**How It Works**:

1. Customers use the ESP32 smart pad to navigate a menu (Buttons 3/4 for scrolling, Button 2 for selection, Button 1 for reset). They add items to a cart, view the cart on the OLED (e.g., “Cart: Burger x2”), and submit orders by long-pressing Button 2.
2. The ESP32 sends a POST request to `https://bistro-92backend.onrender.com/api/orders` with `table_number` and `items`.
3. The backend stores the order in Neon’s `orders` table and returns a 201 response.
4. The Next.js frontend polls the GET `/api/orders` endpoint, updating the manager dashboard in real-time to show new orders.
5. Kitchen staff view the dashboard to process orders efficiently, with data persisted in Neon for reliability.

This system ensures a seamless ordering experience, real-time order tracking, and efficient processing, aligning with Bistro 92’s goals.

## A) Quick Fixes (150 Points)

### Q1: Three Essential Features for Customer Satisfaction and Efficient Order Processing (25 points)

1. **User-Friendly ESP32 Interface**: The smart pad’s OLED displays a simple menu with large text and a real-time cart summary (e.g., “Cart: Pizza x1”). Intuitive controls (Buttons 3/4 for navigation, Button 2 for selection) ensure customers can order easily, enhancing satisfaction.
2. **Real-Time Manager Dashboard**: The Next.js frontend updates every 5 seconds, showing orders (`order_id`, `table_number`, `items`, `created_at`), enabling staff to prioritize and process orders quickly, reducing wait times.
3. **Reliable Cloud Storage**: The Node.js backend stores orders in Neon PostgreSQL via POST `/api/orders`, ensuring data integrity and enabling accurate order fulfillment, even during peak hours.

### Q2: Two Design Principles for an Intuitive Smart Pad Interface (25 points)

1. **Minimalistic UI**: The ESP32 OLED shows one menu item at a time with a concise cart display (e.g., “Cart: Empty” or truncated “Burger x2…”), reducing cognitive load for tech novices.
2. **Clear Feedback**: Visual confirmations (e.g., “Added: Pizza x1”, “Order Submitted”) and distinct button actions (e.g., long press Button 2 to submit) guide users clearly through the ordering process.

### Q3: Three Potential Security Vulnerabilities and Solutions (30 points)

1. **Vulnerability**: Order Tampering (Malicious POST requests to `/api/orders`).
   - **Solution**: Implement API key authentication in `server.js` to restrict POST requests to authorized ESP32 devices.
2. **Vulnerability**: Data Interception (Unencrypted HTTP traffic).
   - **Solution**: Use HTTPS (enabled via Render and Neon’s SSL) to encrypt all API communications.
3. **Vulnerability**: SQL Injection (Improper query handling).
   - **Solution**: Use parameterized queries (e.g., `pool.query('INSERT INTO orders (...) VALUES ($1, $2)', [table_number, items])`), as implemented, to prevent injection attacks.

### Q4: Two Strategies for System Responsiveness and Stability During Peak Hours (30 points)

1. **Database Optimization**: Create an index on `orders.created_at` in Neon (`CREATE INDEX idx_orders_created_at ON orders(created_at);`) to speed up GET `/api/orders` queries, ensuring the frontend remains responsive.
2. **Backend Scaling**: Use Render’s auto-scaling (requires paid tier) and add Redis caching for GET `/api/orders` results to reduce database load, maintaining stability under high traffic.

### Q5: One Method to Integrate Inventory System Without Disruption (40 points)

- **Method**: API-Based Incremental Integration
  - **Description**: Develop a REST API wrapper for the existing inventory system (e.g., GET `/inventory/items`, POST `/inventory/update`). Update `server.js` to check item availability via the API before accepting POST `/api/orders`. Deploy the wrapper alongside the current system, testing in parallel. Gradually transition ESP32 orders to the new API, ensuring no operational downtime.
  - **Non-Disruptive**: The wrapper operates independently, allowing validation without affecting the existing system.

## B) Tech Tricks (450 Points)

### Q1: Database Schema for Tracking Users, Orders, Menu Items, Tables, and Payments (70 points)

- **Schema**:
  - **users**: Stores customer/staff data.
    - `user_id` (SERIAL PRIMARY KEY)
    - `name` (VARCHAR(100))
    - `email` (VARCHAR(100) UNIQUE)
    - `role` (VARCHAR(20), e.g., ‘customer’, ‘staff’)
  - **tables**: Tracks restaurant tables.
    - `table_id` (SERIAL PRIMARY KEY)
    - `table_number` (VARCHAR(50) UNIQUE)
    - `capacity` (INTEGER)
  - **menu_items**: Stores menu items.
    - `item_id` (SERIAL PRIMARY KEY)
    - `name` (VARCHAR(100))
    - `price` (DECIMAL(10,2))
    - `category` (VARCHAR(50))
  - **orders**: Tracks customer orders.
    - `order_id` (SERIAL PRIMARY KEY)
    - `table_id` (INTEGER, FOREIGN KEY REFERENCES tables)
    - `user_id` (INTEGER, FOREIGN KEY REFERENCES users)
    - `items` (JSONB, e.g., `[{ "item_id": 1, "quantity": 2 }]`)
    - `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
  - **payments**: Tracks order payments.
    - `payment_id` (SERIAL PRIMARY KEY)
    - `order_id` (INTEGER, FOREIGN KEY REFERENCES orders)
    - `amount` (DECIMAL(10,2))
    - `payment_method` (VARCHAR(50))
    - `payment_time` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- **Optimization**:
  - Indexes: `created_at` on `orders` for fast time-based queries, `table_id` and `user_id` for joins.
  - JSONB for `items` allows flexible order details without multiple tables.
  - Foreign keys ensure data integrity.

### Q2: SQL Query to Retrieve Orders from the Last Hour (80 points)

- **Query**:
  ```sql
  SELECT o.order_id, t.table_number, o.items, o.created_at
  FROM orders o
  JOIN tables t ON o.table_id = t.table_id
  WHERE o.created_at >= NOW() - INTERVAL '1 hour'
  ORDER BY o.created_at DESC;
  ```
- **Optimization**:
  - Index on `orders.created_at` (`CREATE INDEX idx_orders_created_at ON orders(created_at);`) ensures fast filtering.
  - Join with `tables` uses `table_id` index for quick lookups.
  - `ORDER BY` leverages the index for efficient sorting.

### Q3: Real-Time Kitchen Staff Notification Feature (90 points)

- **Feature**: When an order is placed via POST `/api/orders`, the backend triggers a real-time notification to kitchen staff.
- **Implementation**:
  - **Backend**: Update `server.js` to use **Pusher** (WebSocket service) to broadcast new orders:
    ```javascript
    const Pusher = require('pusher');
    const pusher = new Pusher({ appId: 'APP_ID', key: 'KEY', secret: 'SECRET', cluster: 'CLUSTER' });
    app.post('/api/orders', async (req, res) => {
      const { table_number, items } = req.body;
      if (!table_number || !items) return res.status(400).json({ error: 'Missing fields' });
      const result = await pool.query(
        'INSERT INTO orders (table_number, items) VALUES ($1, $2) RETURNING *',
        [table_number, items]
      );
      pusher.trigger('kitchen-channel', 'new-order', result.rows[0]);
      res.status(201).json({ message: 'Order inserted', order: result.rows[0] });
    });
    ```
  - **Frontend**: Add a notification component to the Next.js dashboard (`page.tsx`):
    ```typescript
    useEffect(() => {
      const pusher = new Pusher('KEY', { cluster: 'CLUSTER' });
      const channel = pusher.subscribe('kitchen-channel');
      channel.bind('new-order', (data: Order) => {
        alert(`New Order: Table ${data.table_number}, ${data.items}`);
      });
      return () => pusher.disconnect();
    }, []);
    ```
- **Tech Stack**:
  - **Pusher**: For real-time WebSocket notifications.
  - **Node.js/Express**: Handles order submission.
  - **Next.js**: Displays notifications.
  - **Neon PostgreSQL**: Stores orders.
- **Justification**: Pusher ensures low-latency notifications, and WebSockets scale better than polling for real-time updates.

### Q4: Cloud-Based System Architecture (100 points)

- **Architecture**:
  - **Smart Pads (ESP32)**: Send HTTP POST requests to the backend via Wi-Fi.
  - **Load Balancer**: AWS Elastic Load Balancer distributes traffic to backend instances.
  - **Backend**: Node.js/Express on Render (or AWS EC2 with auto-scaling), handling POST `/api/orders` and GET `/api/orders`.
  - **Database**: Neon PostgreSQL (scalable, serverless) with read replicas for high read traffic.
  - **Cache**: Redis on AWS ElastiCache for caching GET `/api/orders` results, reducing database load.
  - **Frontend**: Next.js on Vercel, polling GET `/api/orders` every 5 seconds.
  - **Real-Time Notifications**: Pusher for kitchen alerts.
  - **Monitoring**: AWS CloudWatch for performance metrics and error tracking.
- **Low Latency**: Load balancer and Redis cache minimize response times. Neon’s serverless scaling handles query spikes.
- **High Availability**: Auto-scaling backend instances and Neon read replicas ensure uptime during peak hours.

### Q5: Real-Time Dashboard Design (110 points)

- **Features**:
  - **Pending Orders**: Table showing orders where `status = 'pending'`.
  - **Average Fulfillment Time**: Calculated as `AVG(completed_at - created_at)` for completed orders.
  - **Total Sales**: Sum of `payments.amount` for the day.
- **Implementation**:
  - **Frontend**: Next.js dashboard (`page.tsx`) with three components:
    - **Pending Orders Table**: Polls GET `/api/orders?status=pending`.
    - **Fulfillment Time Chart**: Uses Chart.js to plot average fulfillment time (fetched via GET `/api/metrics/fulfillment`).
    - **Total Sales Display**: Fetches GET `/api/metrics/sales`.
  - **Backend**: Add endpoints in `server.js`:
    ```javascript
    app.get('/api/orders', async (req, res) => {
      const { status } = req.query;
      const query = status ? 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC' : 'SELECT * FROM orders ORDER BY created_at DESC';
      const result = await pool.query(query, status ? [status] : []);
      res.json({ orders: result.rows });
    });
    app.get('/api/metrics/fulfillment', async (req, res) => {
      const result = await pool.query(
        'SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) AS avg_minutes FROM orders WHERE status = $1',
        ['completed']
      );
      res.json({ avg_fulfillment_time: result.rows[0].avg_minutes });
    });
    app.get('/api/metrics/sales', async (req, res) => {
      const result = await pool.query('SELECT SUM(amount) AS total FROM payments WHERE payment_time::date = CURRENT_DATE');
      res.json({ total_sales: result.rows[0].total });
    });
    ```
- **Tools**:
  - **Next.js**: For responsive UI.
  - **Chart.js**: For fulfillment time visualization.
  - **Neon PostgreSQL**: For data storage.
  - **Vercel**: For hosting.
- **Justification**:
  - Next.js ensures fast rendering and scalability.
  - Chart.js provides clear visualizations.
  - Neon’s query performance supports real-time metrics.
  - Vercel’s CDN ensures low-latency dashboard access.

## C) Bonus Boosters (500 Points)

### Q1: RESTful API for Order Placement with High Concurrency (250 points)

- **Endpoints**:
  - **POST /api/orders**:
    - **Request**: `Content-Type: application/json`
      ```json
      {
        "table_number": "Table 1",
        "items": [{ "item_id": 1, "quantity": 2 }],
        "user_id": 1
      }
      ```
    - **Response** (201 Created):
      ```json
      {
        "message": "Order created",
        "order": {
          "order_id": 5,
          "table_number": "Table 1",
          "items": [{ "item_id": 1, "quantity": 2 }],
          "created_at": "2025-04-27T12:00:00Z"
        }
      }
      ```
    - **Errors**:
      - 400: Missing fields
      - 409: Duplicate order (based on unique constraint)
  - **GET /api/orders**:
    - **Query Params**: `status` (optional, e.g., `pending`)
    - **Response** (200 OK):
      ```json
      {
        "orders": [
          {
            "order_id": 5,
            "table_number": "Table 1",
            "items": [{ "item_id": 1, "quantity": 2 }],
            "created_at": "2025-04-27T12:00:00Z"
          },
          ...
        ]
      }
      ```
- **Concurrency Controls**:
  - **Database Transactions**: Use PostgreSQL transactions in `server.js`:
    ```javascript
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO orders (table_id, user_id, items) VALUES ($1, $2, $3) RETURNING *',
        [table_id, user_id, items]
      );
      await client.query('COMMIT');
      res.status(201).json({ message: 'Order created', order: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Server error' });
    } finally {
      client.release();
    }
    ```
  - **Rate Limiting**: Use `express-rate-limit` to cap requests per IP.
  - **Unique Constraints**: Add a unique index on `orders(table_id, created_at)` to prevent duplicate orders.
  - **Async Queue**: Use Bull (Redis-based) to queue order processing during spikes, ensuring no data loss.

### Q2: Enhance API for Extreme Scalability (250 points)

- **Strategies**:
  - **Horizontal Scaling**: Deploy multiple Node.js instances behind AWS Elastic Load Balancer, auto-scaling based on CPU usage.
  - **Database Sharding**: Shard Neon PostgreSQL by `table_id` to distribute load across nodes, improving write performance.
  - **Event-Driven Architecture**: Use AWS SNS/SQS to decouple order submission:
    - POST `/api/orders` publishes to an SNS topic.
    - SQS queues process orders asynchronously, updating the database.
  - **Caching**: Cache GET `/api/orders` results in Redis for 5 seconds, reducing database queries.
  - **Connection Pooling**: Configure `pg.Pool` in `server.js` with a high `max` connections (e.g., 100) to handle concurrent requests.
- **Implementation**:
  - **SQS Integration** in `server.js`:
    ```javascript
    const AWS = require('aws-sdk');
    const sqs = new AWS.SQS({ region: 'us-east-1' });
    app.post('/api/orders', async (req, res) => {
      const { table_number, items } = req.body;
      await sqs.sendMessage({
        QueueUrl: 'ORDER_QUEUE_URL',
        MessageBody: JSON.stringify({ table_number, items })
      }).promise();
      res.status(202).json({ message: 'Order queued' });
    });
    ```
  - **Worker**: Separate Node.js process to consume SQS messages and insert into Neon.
- **Justification**:
  - Sharding and caching handle high read/write loads.
  - SNS/SQS ensures no data loss during spikes.
  - Auto-scaling maintains performance under extreme concurrency.

## D) Big Idea (up to 300 Points)

- **Problem**: Customers are indecisive about menu choices, leading to longer ordering times and reduced table turnover.
- **Solution**: **AI-Driven Menu Recommendations** displayed on the ESP32 OLED and Next.js dashboard. The system suggests popular or personalized items (e.g., “Popular: Burger” or “Try: Pizza”) based on order history and customer preferences.
- **Implementation**:
  - **Backend**: Add a recommendation endpoint in `server.js`:
    ```javascript
    app.get('/api/recommendations', async (req, res) => {
      const result = await pool.query(
        'SELECT items->>\'name\' AS item, COUNT(*) AS count FROM orders, jsonb_array_elements(items) AS items GROUP BY item ORDER BY count DESC LIMIT 3'
      );
      res.json({ recommendations: result.rows.map(row => row.item) });
    });
    ```
  - **ESP32**: Update `bistro92.ino` to fetch recommendations via GET `/api/recommendations` and display on OLED (e.g., “Try: Burger”).
  - **Frontend**: Add a recommendations section in `page.tsx`, polling GET `/api/recommendations`.
  - **ML Enhancement**: Train a lightweight model (e.g., TensorFlow.js) on order data, deployed on AWS Lambda, to predict personalized recommendations based on `user_id` and order history.
- **Tech Stack**:
  - **Node.js/Express**: For recommendation API.
  - **Neon PostgreSQL**: Stores order history.
  - **TensorFlow.js**: For ML model.
  - **AWS Lambda**: Hosts ML inference.
  - **Next.js**: Displays recommendations.
- **Impact**:
  - Reduces decision time, increasing table turnover.
  - Enhances customer experience with personalized suggestions.
  - Scalable via serverless Lambda for ML inference.
- **Future Work**: Integrate with AR on smart pads to visualize recommended dishes, further reducing order regrets.

## Submission Details

- **Repositories**:
  - Backend: [bistro-92backend](https://github.com/BALLISTICrobin/bistro-92backend.git)
  - Frontend: [bistro92frontend](https://github.com/BALLISTICrobin/bistro92frontend-deploy.git)
- **Video Demo**: [demo_video](https://drive.google.com/file/d/1kZi490UqbTd0RgaidsYT1Npurbgbt7m9/view?usp=sharing)
- **Wokwi**: [simulation](https://wokwi.com/projects/429377184799962113)
