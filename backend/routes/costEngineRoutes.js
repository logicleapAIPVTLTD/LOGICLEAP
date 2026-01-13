// backend/routes/costEngineRoutes.js
const express = require("express");
const router = express.Router();
const costEngineController = require("../controllers/costEngineController");

// Optional: Add authentication middleware
// const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/cost-engine/health
 * @desc    Check cost engine service health
 * @access  Public
 */
router.get("/health", costEngineController.checkHealth);

/**
 * @route   GET /api/cost-engine/info
 * @desc    Get cost engine service information
 * @access  Public
 */
router.get("/info", costEngineController.getServiceInfo);

/**
 * @route   POST /api/cost-engine/estimate
 * @desc    Get cost estimate for a project
 * @access  Private (add authenticate middleware if needed)
 * @body    {
 *            state_tier: string (e.g., "Maharashtra-Tier1"),
 *            boq_items: [
 *              {
 *                boq_id: string,
 *                boq_name: string,
 *                bom_items: [
 *                  { item_name: string, quantity: number }
 *                ]
 *              }
 *            ]
 *          }
 */
router.post("/estimate", costEngineController.getCostEstimate);

/**
 * @route   POST /api/cost-engine/estimate/detailed
 * @desc    Get detailed cost estimate with additional metadata
 * @access  Private
 */
router.post("/estimate/detailed", costEngineController.getDetailedEstimate);

/**
 * @route   POST /api/cost-engine/estimate/batch
 * @desc    Process multiple cost estimates in batch
 * @access  Private
 * @body    {
 *            estimates: [
 *              { state_tier: string, boq_items: [...] },
 *              ...
 *            ]
 *          }
 */
router.post("/estimate/batch", costEngineController.batchCostEstimate);

module.exports = router;
