import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /distributor/
 * Distributor portal (placeholder)
 */
router.get('/', asyncHandler(async (req, res) => {
  res.send(`
    <h1>GroupSpark Distributor Portal</h1>
    <p>Distributor functionality coming soon...</p>
    <ul>
      <li>Registration & Onboarding</li>
      <li>Credit Inventory Management</li>
      <li>Sales Dashboard</li>
      <li>Code Generation</li>
      <li>Earnings Tracking</li>
    </ul>
  `);
}));

export default router;