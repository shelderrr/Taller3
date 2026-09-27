const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
// Agregamos verifyAdmin aquí
const { verifyVendedor, verifyAdmin } = require('../middlewares/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../uploads'); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

module.exports = (productController) => {
  router.get('/products', (req, res) => productController.getAll(req, res));
  router.post('/products', verifyVendedor, upload.single('image'), (req, res) => productController.create(req, res));
  router.delete('/products/:id', verifyVendedor, (req, res) => productController.delete(req, res));
  
  // NUEVA RUTA: Solo para administradores
  router.patch('/products/:id/status', verifyAdmin, (req, res) => productController.updateStatus(req, res));

  return router;
};
