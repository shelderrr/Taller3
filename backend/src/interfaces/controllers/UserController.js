class UserController {
  constructor(userUseCase) {
    this.userUseCase = userUseCase;
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await this.userUseCase.login(email, password);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      // Nota: Quitamos 'role' de aquí porque ahora se asigna en el UseCase
      const id = await this.userUseCase.register(name, email, password);
      res.status(201).json({ message: 'Usuario registrado exitosamente (Pendiente de aprobación)', id });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const users = await this.userUseCase.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await this.userUseCase.deleteUser(id);
      res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // NUEVA FUNCIÓN INTEGRADA CORRECTAMENTE DENTRO DE LA CLASE
  async approve(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body; 
      await this.userUseCase.approveUser(id, role);
      res.json({ message: 'Usuario aprobado y rol asignado correctamente' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = UserController;
