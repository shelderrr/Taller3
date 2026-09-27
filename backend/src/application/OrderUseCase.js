const Order = require('../domain/Order');

class OrderUseCase {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }

  async createOrder(userId, items) {
    const order = new Order(null, userId, items);
    return await this.orderRepository.createOrder(userId, items, order.totalPrice);
  }

  async getAllOrders() {
    return await this.orderRepository.findAll();
  }
}

module.exports = OrderUseCase;
