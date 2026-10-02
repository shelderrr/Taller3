class ProductUseCase {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  // MÉTODO CORREGIDO: Filtra por el id del vendedor
  async getProducts(user) {
    // Si el usuario existe y es un vendedor, trae solo sus productos
    if (user && user.role === 'vendedor') {
      return await this.productRepository.findByVendorId(user.id);
    }
    
    // Si es administrador, distribuidor o no hay sesión, trae todo el catálogo
    return await this.productRepository.findAll();
  }

  async createProduct(data) {
    return await this.productRepository.save(data);
  }

  async updateStatus(id, status) {
    return await this.productRepository.updateStatus(id, status);
  }

  async deleteProduct(id) {
    return await this.productRepository.delete(id);
  }
}

module.exports = ProductUseCase;
