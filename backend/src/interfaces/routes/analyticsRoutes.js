const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middlewares/authMiddleware');

module.exports = (analyticsController) => {
  router.get('/analytics/dashboard', verifyAdmin, (req, res) => analyticsController.getDashboard(req, res));
  return router;
};