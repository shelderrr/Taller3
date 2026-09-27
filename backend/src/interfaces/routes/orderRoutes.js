const express = require('express');
const router = express.Router();
const { verifyDistribuidor } = require('../middlewares/authMiddleware');

module.exports = (orderController) => {
  // Ambas rutas protegidas para que solo el distribuidor pueda operar
  router.post('/orders', verifyDistribuidor, (req, res) => orderController.create(req, res));
  router.get('/orders', verifyDistribuidor, (req, res) => orderController.getAll(req, res));

  return router;
};
