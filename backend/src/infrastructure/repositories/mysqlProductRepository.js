const pool = require('../database/mysqlPool');
const Product = require('../../domain/Product');

class MysqlProductRepository {
  async findAll() {
    const [rows] = await pool.query(`
      SELECT p.*, u.name as vendedor_name 
      FROM products p 
      LEFT JOIN users u ON p.vendedor_id = u.id
    `);
    return rows.map(row => new Product(
      row.id, row.name, row.price, row.stock, row.image_url, row.vendedor_id, row.vendedor_name, row.status
    ));
  }

  async findApproved() {
    const [rows] = await pool.query(`
      SELECT p.*, u.name as vendedor_name
      FROM products p
      LEFT JOIN users u ON p.vendedor_id = u.id
      WHERE p.status = 'aprobado' AND p.stock > 0
      ORDER BY p.name ASC
    `);
    return rows.map(row => new Product(
      row.id, row.name, row.price, row.stock, row.image_url, row.vendedor_id, row.vendedor_name, row.status
    ));
  }

  async save(product) {
    // Al registrar, forzamos el status a 'pendiente'
    const [result] = await pool.query(
      'INSERT INTO products (name, price, stock, image_url, vendedor_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [product.name, product.price, product.stock, product.imageUrl, product.vendedorId, 'pendiente']
    );
    return result.insertId;
  }

  async update(id, name, price, stock, imageUrl) {
    const [result] = await pool.query(
      'UPDATE products SET name = ?, price = ?, stock = ?, image_url = ? WHERE id = ?',
      [name, price, stock, imageUrl, id]
    );
    return result.affectedRows > 0;
  }

  async deleteById(id) {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // NUEVA FUNCIÓN: Para que el admin apruebe o rechace el producto
  async updateStatus(id, status) {
    const [result] = await pool.query(
      'UPDATE products SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

async findByVendorId(vendedorId) {

  // Asegúrate de usar el nombre correcto de tu conexión (ej. this.pool, pool, db)
	const [rows] = await pool.query('SELECT * FROM products WHERE vendedor_id = ?', [vendedorId]); 
// (Asegúrate de que coincida con el nombre que recibe tu función arriba)
  return rows;
}
}

module.exports = MysqlProductRepository;
