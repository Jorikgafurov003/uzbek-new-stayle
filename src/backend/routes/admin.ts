import express from 'express';
import { 
  getAIInsights, getProfitForecast, getKPILeaderboard, 
  getSystemHealth, getSecurityAlerts, getTopStats, getSalaryReport 
} from '../controllers/adminController.js';

const router = express.Router();

router.get("/ai-insights", getAIInsights);
router.get("/profit-forecast", getProfitForecast);
router.get("/kpi-leaderboard", getKPILeaderboard);
router.get("/system-health", getSystemHealth);
router.get("/security-alerts", getSecurityAlerts);
router.get("/top-stats", getTopStats);
router.get("/salary-report", getSalaryReport);

export default router;
