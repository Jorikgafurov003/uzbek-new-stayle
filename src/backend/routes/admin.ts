import express from 'express';
import {
  getAIInsights, getProfitForecast, getKPILeaderboard,
  getSystemHealth, getSecurityAlerts, getTopStats, getSalaryReport,
  getAccounting, resetStats, getSystemErrors, getSalaryConfigs,
  getSalaries, getCommissions, setCommission, deleteSystemError, clearSystemErrors
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
router.get("/commissions", getCommissions);
router.post("/set-commission", setCommission);
router.get("/salary-configs", getSalaryConfigs);
router.get("/salaries", getSalaries);
router.delete("/system-errors/:id", deleteSystemError);
router.delete("/system-errors", clearSystemErrors);

export default router;
