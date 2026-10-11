const pool = require('../database/mysqlPool');

const NON_CANCELLED = "LOWER(TRIM(COALESCE(o.status, ''))) NOT IN ('cancelado', 'cancelada', 'canceled', 'cancelled')";

class MysqlAnalyticsRepository {
  constructor(database = pool) {
    this.database = database;
  }

  async getDashboardData({ startDate, endExclusive, granularity, topLimit }) {
    const range = 'o.created_at >= ? AND o.created_at < ?';
    const rangeParams = [startDate, endExclusive];
    const periodExpression = {
      day: "DATE_FORMAT(o.created_at, '%Y-%m-%d')",
      week: "DATE_FORMAT(o.created_at, '%x-W%v')",
      month: "DATE_FORMAT(o.created_at, '%Y-%m')"
    }[granularity];

    const [summaryRows, revenueTrend, statuses, topProducts, customers] = await Promise.all([
      this.database.query(`
        SELECT
          COALESCE(SUM(CASE WHEN ${NON_CANCELLED} THEN o.total_price ELSE 0 END), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN ${NON_CANCELLED} THEN 1 ELSE 0 END), 0) AS order_count,
          COUNT(DISTINCT CASE WHEN ${NON_CANCELLED} THEN o.user_id END) AS customer_count
        FROM orders o
        WHERE ${range}
      `, rangeParams),
      this.database.query(`
        SELECT ${periodExpression} AS period,
          COALESCE(SUM(CASE WHEN ${NON_CANCELLED} THEN o.total_price ELSE 0 END), 0) AS revenue,
          COALESCE(SUM(CASE WHEN ${NON_CANCELLED} THEN 1 ELSE 0 END), 0) AS order_count
        FROM orders o
        WHERE ${range}
        GROUP BY period
        ORDER BY period ASC
      `, rangeParams),
      this.database.query(`
        SELECT CASE
          WHEN LOWER(TRIM(COALESCE(o.status, ''))) IN ('cancelado', 'cancelada', 'canceled', 'cancelled') THEN 'Cancelado'
          WHEN LOWER(TRIM(COALESCE(o.status, ''))) IN ('enviado', 'enviada', 'shipped', 'entregado', 'entregada', 'delivered') THEN 'Enviado'
          WHEN LOWER(TRIM(COALESCE(o.status, ''))) IN ('pagado', 'pagada', 'paid', 'completado', 'completada', 'completed') THEN 'Pagado'
          ELSE 'Pendiente'
        END AS status, COUNT(*) AS order_count
        FROM orders o
        WHERE ${range}
        GROUP BY status
      `, rangeParams),
      this.database.query(`
        SELECT oi.product_id, COALESCE(p.name, CONCAT('Producto #', oi.product_id)) AS product_name,
          SUM(oi.quantity) AS units_sold,
          SUM(oi.quantity * oi.price) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE ${range} AND ${NON_CANCELLED}
        GROUP BY oi.product_id, p.name
        ORDER BY units_sold DESC, revenue DESC
        LIMIT ?
      `, [...rangeParams, topLimit]),
      this.database.query(`
        SELECT u.id AS user_id, u.name,
          COUNT(o.id) AS order_count,
          SUM(o.total_price) AS total_spent,
          AVG(o.total_price) AS average_order_value
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE ${range} AND ${NON_CANCELLED}
        GROUP BY u.id, u.name
        ORDER BY total_spent DESC, order_count DESC
        LIMIT 20
      `, rangeParams)
    ]);

    return {
      summary: summaryRows[0][0],
      revenueTrend: revenueTrend[0],
      statuses: statuses[0],
      topProducts: topProducts[0],
      customers: customers[0]
    };
  }
}

module.exports = MysqlAnalyticsRepository;