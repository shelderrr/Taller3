const pool = require('../database/mysqlPool');

class MysqlOrderRepository {
  async createOrder(userId, items, sendReceipt) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const productIds = items.map(item => item.productId);
      const [products] = await connection.query(
        `SELECT id, name, price, stock, vendedor_id
         FROM products
         WHERE id IN (?) AND status = 'aprobado'
         FOR UPDATE`,
        [productIds]
      );
      if (products.length !== items.length) {
        const error = new Error('Uno o más productos ya no están disponibles.');
        error.statusCode = 400;
        throw error;
      }

      const productById = new Map(products.map(product => [Number(product.id), product]));
      const lines = items.map(item => {
        const product = productById.get(item.productId);
        if (Number(product.stock) < item.quantity) {
          const error = new Error(`Stock insuficiente para ${product.name}.`);
          error.statusCode = 400;
          throw error;
        }
        const price = Number(product.price);
        return {
          productId: Number(product.id),
          productName: product.name,
          vendedorId: Number(product.vendedor_id),
          quantity: item.quantity,
          price,
          subtotal: price * item.quantity
        };
      });
      const totalPrice = lines.reduce((total, item) => total + item.subtotal, 0);

      let customer = null;
      const sellerIds = [...new Set(lines.map(item => item.vendedorId))];
      const [sellers] = await connection.query(
        'SELECT id, name FROM users WHERE id IN (?)',
        [sellerIds]
      );
      const sellerNames = new Map(sellers.map(seller => [Number(seller.id), seller.name]));
      lines.forEach(item => {
        item.vendedorName = sellerNames.get(item.vendedorId) || 'Vendedor';
      });

      if (sendReceipt) {
        const [customers] = await connection.query(
          'SELECT name, email FROM users WHERE id = ? LIMIT 1',
          [userId]
        );
        customer = customers[0];
        if (!customer?.email) {
          const error = new Error('No se encontró el correo de la cuenta.');
          error.statusCode = 400;
          throw error;
        }
      }

      const [orderResult] = await connection.query(
        'INSERT INTO orders (user_id, total_price) VALUES (?, ?)',
        [userId, totalPrice]
      );
      const orderId = orderResult.insertId;

      for (const item of lines) {
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
          [item.quantity, item.productId, item.quantity]
        );
        await connection.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.productId, item.quantity, item.price]
        );
      }

      await connection.commit();
      return {
        orderId,
        totalPrice,
        items: lines,
        customerName: customer?.name,
        customerEmail: customer?.email,
        createdAt: new Date()
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findAll() {
    const [rows] = await pool.query(`
      SELECT o.id, o.total_price, o.status, o.created_at, u.name as distribuidor_name 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `);
    return rows;
  }

  async findSoldProducts() {
    const [rows] = await pool.query(`
      SELECT oi.product_id, p.name AS product_name, p.image_url,
        SUM(oi.quantity) AS quantity_sold,
        SUM(oi.quantity * oi.price) AS total_sales,
        MAX(o.created_at) AS last_sold_at
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      GROUP BY oi.product_id, p.name, p.image_url
      ORDER BY quantity_sold DESC, product_name ASC
    `);
    return rows;
  }
}

module.exports = MysqlOrderRepository;
