const express = require('express');
const router = express.Router();
const wbsController = require('../controllers/wbsController');

/**
 * @route   POST /api/wbs/generate
 * @desc    Generate WBS from single BOQ item
 * @access  Public
 */
router.post('/generate', wbsController.generateWBS);

/**
 * @route   POST /api/wbs/batch
 * @desc    Generate WBS for multiple BOQ items
 * @access  Public
 */
router.post('/batch', wbsController.generateBatchWBS);

/**
 * @route   GET /api/wbs/health
 * @desc    Health check for WBS service
 * @access  Public
 */
router.get('/health', wbsController.wbsHealthCheck);

module.exports = router;