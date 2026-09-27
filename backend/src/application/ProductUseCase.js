const Product = require('../domain/Product');

class ProductUseCase {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async getAllProducts() {
    return await this.productRepository.findAll();
  }

  async createProduct(name, price, stock, imageUrl) {
    const newProduct = new Product(null, name, price, stock, imageUrl);
    return await this.productRepository.save(newProduct);
  }

  async updateProduct(id, name, price, stock, imageUrl) {
    return await this.productRepository.update(id, name, price, stock, imageUrl);
  }

  async deleteProduct(id) {
    return await this.productRepository.deleteById(id);
  }
  async updateProductStatus(id, status) {
    if (status !== 'aprobado' && status !== 'rechazado') {
      throw new Error('Estado inválido. Debe ser aprobado o rechazado.');
    }
    return await this.productRepository.updateStatus(id, status);
  }
}

module.exports = ProductUseCase;
