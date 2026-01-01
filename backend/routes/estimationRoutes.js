const express = require('express');
const router = express.Router();
const estimationController = require('../controllers/estimationController');

/**
 * @route   POST /api/estimation/calculate
 * @desc    Calculate price estimation based on BOM
 * @body    { stateCode, cityTier, bomFile? }
 */
router.post('/calculate', estimationController.calculateEstimation);

/**
 * @route   POST /api/estimation/breakdown
 * @desc    Get detailed estimation breakdown
 * @body    { stateCode, cityTier, bomFile? }
 */
router.post('/breakdown', estimationController.getEstimationBreakdown);

/**
 * @route   GET /api/estimation/locations
 * @desc    Get available states and city tiers
 */
router.get('/locations', estimationController.getLocations);

/**
 * @route   GET /api/estimation/validate
 * @desc    Validate master data files
 */
router.get('/validate', estimationController.validateMasterData);

module.exports = router;