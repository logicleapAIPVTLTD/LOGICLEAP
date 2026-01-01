const express = require('express');
const router = express.Router();
const boqController = require('../controllers/boqController');

/**
 * @route   POST /api/boq/train
 * @desc    Train rate prediction model
 * @access  Public
 */
router.post('/train', boqController.trainModel);

/**
 * @route   POST /api/boq/predict
 * @desc    Predict rates for BOQ items
 * @access  Public
 */
router.post('/predict', boqController.predictRates);

/**
 * @route   POST /api/boq/extract
 * @desc    Extract BOQ from text and predict rates
 * @access  Public
 */
router.post('/extract', boqController.extractAndPredict);

/**
 * @route   GET /api/boq/health
 * @desc    Health check for BOQ service
 * @access  Public
 */
router.get('/health', boqController.boqHealthCheck);

module.exports = router;