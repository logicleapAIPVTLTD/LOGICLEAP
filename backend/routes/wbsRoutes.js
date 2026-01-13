const express = require("express");
const router = express.Router();
const {
  generateBatchWBS,
  generateWBS,
} = require("../controllers/wbsController");

/**
 * @route   POST /api/wbs/generate
 * @desc    Generate WBS from single BOQ item
 * @access  Public
 */
router.post("/generate", generateWBS);

/**
 * @route   POST /api/wbs/batch
 * @desc    Generate WBS for multiple BOQ items
 * @access  Public
 */
router.post("/batch", generateBatchWBS);

/**
 * @route   GET /api/wbs/health
 * @desc    Health check for WBS service
 * @access  Public
 */

module.exports = router;
