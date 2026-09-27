const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '../.env' }); 

// 1. IMPORTAR CAPAS DE USUARIO
const MysqlUserRepository = require('./infrastructure/repositories/mysqlUserRepository');
const UserUseCase = require('./application/UserUseCase');
const UserController = require('./interfaces/controllers/UserController');
const userRoutes = require('./interfaces/routes/userRoutes');

// 2. IMPORTAR CAPAS DE PRODUCTO
const MysqlProductRepository = require('./infrastructure/repositories/mysqlProductRepository');
const ProductUseCase = require('./application/ProductUseCase');
const ProductController = require('./interfaces/controllers/ProductController');
const productRoutes = require('./interfaces/routes/productRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// 3. HACER PÚBLICA LA CARPETA DE IMÁGENES
// Así el frontend podrá acceder a http://localhost:3000/uploads/imagen.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 4. INYECCIÓN DE DEPENDENCIAS (USUARIOS)
const userRepository = new MysqlUserRepository();
const userUseCase = new UserUseCase(userRepository);
const userController = new UserController(userUseCase);

// 5. INYECCIÓN DE DEPENDENCIAS (PRODUCTOS)
const productRepository = new MysqlProductRepository();
const productUseCase = new ProductUseCase(productRepository);
const productController = new ProductController(productUseCase);

// ... debajo de donde importas las cosas de Productos ...
const MysqlOrderRepository = require('./infrastructure/repositories/mysqlOrderRepository');
const OrderUseCase = require('./application/OrderUseCase');
const OrderController = require('./interfaces/controllers/OrderController');
const orderRoutes = require('./interfaces/routes/orderRoutes');

// ... más abajo, debajo de la inyección de Productos ...
const orderRepository = new MysqlOrderRepository();
const orderUseCase = new OrderUseCase(orderRepository);
const orderController = new OrderController(orderUseCase);

// ... en la sección de rutas ...
app.use('/api', orderRoutes(orderController));
// 6. CARGAR TODAS LAS RUTAS
app.use('/api', userRoutes(userController));
app.use('/api', productRoutes(productController));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend activo en http://localhost:${PORT}`);
});
