import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /admin/
 * Admin dashboard (placeholder)
 */
router.get('/', asyncHandler(async (req, res) => {
  res.send(`
    <h1>GroupSpark Admin Panel</h1>
    <p>Admin functionality coming soon...</p>
    <ul>
      <li>Platform Analytics</li>
      <li>Distributor Management</li>
      <li>Product Configuration</li>
      <li>Financial Reports</li>
    </ul>
  `);
}));

export default router;