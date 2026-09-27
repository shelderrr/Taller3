class Order {
  constructor(id, userId, items, status = 'completado') {
    this.id = id;
    this.userId = userId;
    // items es un arreglo con: { productId, quantity, price }
    this.items = items; 
    this.status = status;
    this.totalPrice = this.calculateTotal(); 
  }

  calculateTotal() {
    if (!this.items || this.items.length === 0) return 0;
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}

module.exports = Order;
