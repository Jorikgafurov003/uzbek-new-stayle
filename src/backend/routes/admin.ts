import express from 'express';
import {
  getAIInsights, getProfitForecast, getKPILeaderboard,
  getSystemHealth, getSecurityAlerts, getTopStats, getSalaryReport,
  getAccounting, resetStats
} from '../controllers/adminController.js';

const router = express.Router();

router.post("/reset-stats", resetStats);
router.get("/ai-insights", getAIInsights);
router.get("/profit-forecast", getProfitForecast);
router.get("/kpi-leaderboard", getKPILeaderboard);
router.get("/system-health", getSystemHealth);
router.get("/security-alerts", getSecurityAlerts);
router.get("/top-stats", getTopStats);
router.get("/salary-report", getSalaryReport);
router.get("/accounting", getAccounting);

export default router;
