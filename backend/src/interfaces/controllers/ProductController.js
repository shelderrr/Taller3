class ProductController {
  constructor(productUseCase) {
    this.productUseCase = productUseCase;
    
    // Bindeamos los métodos para no perder el contexto de 'this' en el router
    this.getProducts = this.getProducts.bind(this);
    this.createProduct = this.createProduct.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.deleteProduct = this.deleteProduct.bind(this);
  }

  // MÉTODO CORREGIDO: Extrae el usuario y se lo pasa al Caso de Uso
  async getProducts(req, res) {
    try {
      const user = req.user; // Esto viene de tu authMiddleware
      const products = await this.productUseCase.getProducts(user);
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // MÉTODO PARA CREAR
  async createProduct(req, res) {
    try {
      const productData = { ...req.body };
      if (req.file) {
        productData.imageUrl = `/uploads/${req.file.filename}`;
      }
      productData.vendedorId = req.user.id;
      
      const product = await this.productUseCase.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // MÉTODO PARA ACTUALIZAR ESTADO (Admin)
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await this.productUseCase.updateStatus(id, status);
      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // MÉTODO PARA ELIMINAR
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      await this.productUseCase.deleteProduct(id);
      res.status(200).json({ message: 'Producto eliminado' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ProductController;
