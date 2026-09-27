class Product {
  constructor(id, name, price, stock, imageUrl, vendedorId, vendedorName, status) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.stock = stock;
    this.imageUrl = imageUrl;
    this.vendedorId = vendedorId;
    this.vendedorName = vendedorName;
    this.status = status; // Nuevo atributo: 'pendiente', 'aprobado' o 'rechazado'
  }
}

module.exports = Product;
