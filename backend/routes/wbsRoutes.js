const express = require("express");
const router = express.Router();
const {
  generateBatchWBS,
  generateWBS,
} = require("../controllers/wbsController");

/**
 * @route   POST /api/wbs/generate
 * @desc    Generate WBS for a single BOQ item
 * @body    {work_name: string, description?: string, area?: number, unit?: string, room_name?: string}
 * @access  Public
 */
router.post("/generate", generateWBS);

/**
 * @route   POST /api/wbs/batch
 * @desc    Generate WBS for multiple BOQ items
 * @body    {boq_items: Array<{work_name: string, description?: string, area?: number, unit?: string, room_name?: string}>}
 * @access  Public
 */
router.post("/batch", generateBatchWBS);

/**
 * @route   GET /api/wbs/health
 * @desc    Health check for WBS service
 * @access  Public
 */

module.exports = router;
