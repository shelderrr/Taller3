const STATUS_LABELS = ['Pendiente', 'Pagado', 'Enviado', 'Cancelado'];

function toDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function asNumber(value) {
  return Number(value || 0);
}

class AnalyticsService {
  constructor(analyticsRepository) {
    this.analyticsRepository = analyticsRepository;
  }

  async getDashboard(filters = {}) {
    const today = new Date().toISOString().slice(0, 10);
    const defaultFrom = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const from = filters.from || defaultFrom;
    const to = filters.to || today;
    const granularity = filters.granularity || 'day';
    const topLimit = Number(filters.topLimit || 5);

    const fromDate = toDate(from);
    const toDateValue = toDate(to);
    if (!fromDate || !toDateValue || fromDate > toDateValue) {
      const error = new Error('El rango de fechas no es válido.');
      error.statusCode = 400;
      throw error;
    }
    if (!['day', 'week', 'month'].includes(granularity)) {
      const error = new Error('La agrupación debe ser day, week o month.');
      error.statusCode = 400;
      throw error;
    }
    if (![5, 10].includes(topLimit)) {
      const error = new Error('El ranking debe mostrar 5 o 10 productos.');
      error.statusCode = 400;
      throw error;
    }

    const endExclusive = new Date(toDateValue.valueOf() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    const data = await this.analyticsRepository.getDashboardData({
      startDate: `${from} 00:00:00`,
      endExclusive,
      granularity,
      topLimit
    });

    const summaryRow = data.summary;
    const totalRevenue = asNumber(summaryRow.total_revenue);
    const orderCount = asNumber(summaryRow.order_count);
    const customerCount = asNumber(summaryRow.customer_count);
    const totalStatusOrders = data.statuses.reduce((total, status) => total + asNumber(status.order_count), 0);
    const statusCounts = new Map(data.statuses.map(status => [status.status, asNumber(status.order_count)]));

    return {
      filters: { from, to, granularity, topLimit },
      summary: {
        totalRevenue,
        orderCount,
        averageTicket: orderCount ? totalRevenue / orderCount : 0,
        customerCount,
        averagePerUser: customerCount ? totalRevenue / customerCount : 0
      },
      revenueTrend: data.revenueTrend.map(row => ({
        period: row.period,
        revenue: asNumber(row.revenue),
        orderCount: asNumber(row.order_count)
      })),
      orderStatuses: STATUS_LABELS.map(status => {
        const count = statusCounts.get(status) || 0;
        return {
          status,
          count,
          percentage: totalStatusOrders ? (count / totalStatusOrders) * 100 : 0
        };
      }),
      topProducts: data.topProducts.map(product => ({
        productId: product.product_id,
        productName: product.product_name,
        unitsSold: asNumber(product.units_sold),
        revenue: asNumber(product.revenue)
      })),
      customers: data.customers.map(customer => ({
        userId: customer.user_id,
        name: customer.name,
        orderCount: asNumber(customer.order_count),
        totalSpent: asNumber(customer.total_spent),
        averageOrderValue: asNumber(customer.average_order_value)
      }))
    };
  }
}

module.exports = AnalyticsService;