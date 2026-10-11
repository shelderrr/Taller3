const nodemailer = require('nodemailer');

class OrderEmailService {
  constructor() {
    this.mode = process.env.EMAIL_MODE || 'ethereal';
    this.host = process.env.SMTP_HOST;
    this.port = Number(process.env.SMTP_PORT || 587);
    this.user = process.env.SMTP_USER;
    this.password = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
    this.from = process.env.SMTP_FROM || this.user || 'CondeShop <no-reply@ethereal.email>';
    this.transporter = null;
  }

  isConfigured() {
    return this.mode === 'ethereal' || (
      this.mode === 'smtp' && Boolean(this.host && this.port && this.user && this.password && this.from)
    );
  }

  async getTransporter() {
    if (this.transporter) return this.transporter;

    if (this.mode === 'ethereal') {
      const account = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass }
      });
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: this.user, pass: this.password }
    });
    return this.transporter;
  }

  async verifyConnection() {
    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
    } catch (error) {
      console.error('No se pudo verificar el correo:', error.code || error.name);
      const message = this.mode === 'ethereal'
        ? 'No se pudo conectar al correo de demostración. Revisa la conexión a internet.'
        : 'El proveedor SMTP rechazó el acceso. Revisa las credenciales SMTP.';
      const configError = new Error(message);
      configError.statusCode = 503;
      throw configError;
    }
  }

  async sendOrderReceipt(receipt) {
    const date = new Date(receipt.createdAt).toLocaleString('es-CL');
    const formatMoney = amount => `$${Number(amount).toFixed(2)}`;
    const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
    const textItems = receipt.items.map(item =>
      `${item.productName} - Vendedor: ${item.vendedorName} - ${item.quantity} x ${formatMoney(item.price)} = ${formatMoney(item.subtotal)}`
    );
    const htmlItems = receipt.items.map(item => `
      <tr>
        <td>${escapeHtml(item.productName)}<br><small>Vendedor: ${escapeHtml(item.vendedorName)}</small></td>
        <td>${item.quantity}</td>
        <td>${formatMoney(item.price)}</td>
        <td>${formatMoney(item.subtotal)}</td>
      </tr>
    `).join('');

    const transporter = await this.getTransporter();
    const info = await transporter.sendMail({
      from: this.from,
      to: receipt.customerEmail,
      subject: `CondeShop: detalle de tu pedido #${receipt.orderId}`,
      text: [
        `Hola ${receipt.customerName},`,
        `Registramos tu pedido #${receipt.orderId} el ${date}.`,
        '',
        ...textItems,
        '',
        `Total: ${formatMoney(receipt.totalPrice)}`
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;color:#171717;max-width:680px;margin:auto">
          <h1 style="color:#e87518">CondeShop</h1>
          <p>Hola ${escapeHtml(receipt.customerName)}, recibimos tu pedido <strong>#${receipt.orderId}</strong>.</p>
          <p>Fecha: ${escapeHtml(date)}</p>
          <table style="width:100%;border-collapse:collapse" cellpadding="10" border="1">
            <thead><tr><th align="left">Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead>
            <tbody>${htmlItems}</tbody>
          </table>
          <p style="text-align:right;font-size:20px"><strong>Total: ${formatMoney(receipt.totalPrice)}</strong></p>
          <p>Gracias por comprar en CondeShop.</p>
        </div>
      `
    });
    const previewUrl = this.mode === 'ethereal' ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) console.log('Vista previa del correo de demostración:', previewUrl);
    return { previewUrl };
  }
}

module.exports = OrderEmailService;