class OrderUseCase {
  constructor(orderRepository, orderEmailService) {
    this.orderRepository = orderRepository;
    this.orderEmailService = orderEmailService;
  }

  async createOrder(userId, items, sendReceipt = false) {
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      const error = new Error('El pedido debe incluir entre 1 y 100 productos.');
      error.statusCode = 400;
      throw error;
    }

    const normalizedItems = new Map();
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (!Number.isSafeInteger(productId) || productId <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) {
        const error = new Error('Producto o cantidad inválidos.');
        error.statusCode = 400;
        throw error;
      }
      normalizedItems.set(productId, (normalizedItems.get(productId) || 0) + quantity);
    }

    if (sendReceipt && !this.orderEmailService.isConfigured()) {
      const error = new Error('El envío de correo no está configurado en el servidor.');
      error.statusCode = 503;
      throw error;
    }
    if (sendReceipt) await this.orderEmailService.verifyConnection();

    const receipt = await this.orderRepository.createOrder(
      userId,
      [...normalizedItems].map(([productId, quantity]) => ({ productId, quantity })),
      sendReceipt
    );

    if (!sendReceipt) return { ...receipt, emailSent: null };

    try {
      const delivery = await this.orderEmailService.sendOrderReceipt(receipt);
      return { ...receipt, emailSent: true, previewUrl: delivery.previewUrl };
    } catch (error) {
      console.error('No se pudo enviar el recibo del pedido:', error.message);
      return { ...receipt, emailSent: false };
    }
  }

  async getAllOrders() {
    return await this.orderRepository.findAll();
  }

  async getSoldProducts() {
    return await this.orderRepository.findSoldProducts();
  }
}

module.exports = OrderUseCase;
