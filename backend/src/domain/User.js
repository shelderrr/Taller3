class User {
  constructor(id, name, email, password, role, status) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
    this.status = status; // 'pendiente' o 'aprobado'
  }
}
module.exports = User;
