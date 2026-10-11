class AnalyticsController {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async getDashboard(req, res) {
    try {
      const dashboard = await this.analyticsService.getDashboard(req.query);
      res.json(dashboard);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
}

module.exports = AnalyticsController;