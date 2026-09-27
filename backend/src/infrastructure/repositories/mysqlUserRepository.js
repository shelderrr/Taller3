const pool = require('../database/mysqlPool');
const User = require('../../domain/User');

class MysqlUserRepository {
  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return new User(row.id, row.name, row.email, row.password, row.role, row.status);
  }

  async findAll() {
    const [rows] = await pool.query('SELECT id, name, email, role, status FROM users');
    return rows; 
  }

  async save(user) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [user.name, user.email, user.password, 'user', 'pendiente']
    );
    return result.insertId;
  }

  async deleteById(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Nueva función para aprobar usuarios y asignar rol
  async updateRoleAndStatus(id, role, status) {
    const [result] = await pool.query(
      'UPDATE users SET role = ?, status = ? WHERE id = ?',
      [role, status, id]
    );
    return result.affectedRows > 0;
  }
}
module.exports = MysqlUserRepository;
