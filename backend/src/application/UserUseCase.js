const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../domain/User');

class UserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async login(email, password) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('Credenciales inválidas');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Credenciales inválidas');

    // NUEVO: Bloquear acceso si la cuenta no ha sido aprobada
    if (user.status === 'pendiente') {
      throw new Error('CUENTA_PENDIENTE'); 
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return { 
      token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } 
    };
  }

  async register(name, email, password, isCollaborator = false) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) throw new Error('El correo ya está registrado');

    const hashedPassword = await bcrypt.hash(password, 10);
    const status = isCollaborator === true ? 'pendiente' : 'aprobado';
    const newUser = new User(null, name, email, hashedPassword, 'user', status);
    return await this.userRepository.save(newUser);
  }

  async getAllUsers() {
    return await this.userRepository.findAll();
  }

  async deleteUser(id) {
    return await this.userRepository.deleteById(id);
  }

  // NUEVO: Función para que el admin apruebe la cuenta
  async approveUser(id, role) {
    if (role !== 'vendedor' && role !== 'distribuidor') {
      throw new Error('Rol inválido. Debe ser vendedor o distribuidor.');
    }
    return await this.userRepository.updateRoleAndStatus(id, role, 'aprobado');
  }
}
module.exports = UserUseCase;
