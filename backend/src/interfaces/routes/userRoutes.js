const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middlewares/authMiddleware');

module.exports = (userController) => {
  // Rutas públicas
  router.post('/login', (req, res) => userController.login(req, res));
  router.post('/users', (req, res) => userController.register(req, res)); // <-- Le quitamos verifyAdmin

  // Rutas protegidas (Requieren ser admin)
  router.get('/users', verifyAdmin, (req, res) => userController.getAll(req, res));
  router.delete('/users/:id', verifyAdmin, (req, res) => userController.delete(req, res));
  router.patch('/users/:id/approve', verifyAdmin, (req, res) => userController.approve(req, res));

  return router;
};
