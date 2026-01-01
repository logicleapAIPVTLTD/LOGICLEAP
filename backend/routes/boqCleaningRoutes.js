const express = require('express');
const router = express.Router();
const boqCleaningController = require('../controllers/boqCleaningController');

/**
 * @route   POST /api/boq-cleaning/extract
 * @desc    Extract entities from single text
 * @access  Public
 */
router.post('/extract', boqCleaningController.extractEntities);

/**
 * @route   POST /api/boq-cleaning/batch
 * @desc    Extract entities from multiple texts
 * @access  Public
 */
router.post('/batch', boqCleaningController.extractBatchEntities);

/**
 * @route   GET /api/boq-cleaning/health
 * @desc    Health check for BOQ cleaning service
 * @access  Public
 */
router.get('/health', boqCleaningController.cleaningHealthCheck);

module.exports = router;