const express = require('express');
const router = express.Router();
const { verifyAdmin, verifyDistribuidor, verifyToken, verifyOrderCreator } = require('../middlewares/authMiddleware');

module.exports = (orderController) => {
  // Ambas rutas protegidas para que solo el distribuidor pueda operar
  router.post('/orders', verifyOrderCreator, (req, res) => orderController.create(req, res));
  router.get('/orders', verifyDistribuidor, (req, res) => orderController.getAll(req, res));
  router.patch('/orders/:id/payment-status', verifyAdmin, (req, res) => orderController.updatePaymentStatus(req, res));
  router.get('/sales/products', verifyToken, (req, res) => orderController.getSoldProducts(req, res));

  return router;
};
