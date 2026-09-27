class ProductController {
  constructor(productUseCase) {
    this.productUseCase = productUseCase;
  }

  async getAll(req, res) {
    try {
      const products = await this.productUseCase.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      // Los datos de texto vienen en req.body
      const { name, price, stock } = req.body;
      
      // Si multer procesó una imagen, guardamos la ruta estática
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
      
      const id = await this.productUseCase.createProduct(name, price, stock, imageUrl);
      res.status(201).json({ message: 'Producto registrado exitosamente', id, imageUrl });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await this.productUseCase.deleteProduct(id);
      res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await this.productUseCase.updateProductStatus(id, status);
      res.json({ message: `Producto marcado como ${status} correctamente` });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = ProductController;
