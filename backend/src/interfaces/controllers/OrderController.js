class OrderController {
  constructor(orderUseCase) {
    this.orderUseCase = orderUseCase;
  }

  async create(req, res) {
    try {
      const userId = req.user.id; 
      const { items } = req.body; 
      
      const receipt = await this.orderUseCase.createOrder(userId, items, req.user.role === 'user');
      const message = receipt.emailSent === false
        ? 'El pedido se registró, pero no se pudo enviar el correo.'
        : receipt.emailSent
          ? 'Pedido registrado y recibo enviado al correo de tu cuenta.'
          : 'Pedido registrado exitosamente';
      res.status(201).json({
        message,
        orderId: receipt.orderId,
        totalPrice: receipt.totalPrice,
        emailSent: receipt.emailSent,
        previewUrl: receipt.previewUrl || null
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const orders = await this.orderUseCase.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updatePaymentStatus(req, res) {
    try {
      const order = await this.orderUseCase.updatePaymentStatus(req.params.id, req.body.paymentStatus);
      res.json(order);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  async getSoldProducts(req, res) {
    try {
      const products = await this.orderUseCase.getSoldProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = OrderController;
