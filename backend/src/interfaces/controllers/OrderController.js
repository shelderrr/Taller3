class OrderController {
  constructor(orderUseCase) {
    this.orderUseCase = orderUseCase;
  }

  async create(req, res) {
    try {
      const userId = req.user.id; 
      const { items } = req.body; 
      
      const orderId = await this.orderUseCase.createOrder(userId, items);
      res.status(201).json({ message: 'Pedido registrado exitosamente', orderId });
    } catch (error) {
      res.status(400).json({ error: error.message });
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
}

module.exports = OrderController;
