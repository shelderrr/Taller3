const pool = require('../database/mysqlPool');

class MysqlOrderRepository {
  async createOrder(userId, items, totalPrice) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction(); 

      // 1. Guardar el Pedido Principal
      const [orderResult] = await connection.query(
        'INSERT INTO orders (user_id, total_price) VALUES (?, ?)',
        [userId, totalPrice]
      );
      const orderId = orderResult.insertId;

      // 2. Guardar los detalles (Sin tocar el inventario de la tabla products)
      for (const item of items) {
        await connection.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.productId, item.quantity, item.price]
        );
      }

      await connection.commit(); 
      return orderId;
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
}

module.exports = MysqlOrderRepository;
