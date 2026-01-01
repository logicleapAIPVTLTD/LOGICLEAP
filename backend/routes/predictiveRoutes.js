const express = require('express');
const router = express.Router();
const predictiveController = require('../controllers/predictiveController');

/**
 * @route   POST /api/predictive/build
 * @desc    Build features from CSV data
 * @access  Public
 */
router.post('/build', predictiveController.buildFeatures);

/**
 * @route   POST /api/predictive/train
 * @desc    Train all predictive models
 * @access  Public
 */
router.post('/train', predictiveController.trainModels);

/**
 * @route   POST /api/predictive/predict
 * @desc    Make prediction using specific model
 * @access  Public
 */
router.post('/predict', predictiveController.predict);

/**
 * @route   POST /api/predictive/predict-all
 * @desc    Make predictions using all models
 * @access  Public
 */
router.post('/predict-all', predictiveController.predictAll);

/**
 * @route   GET /api/predictive/health
 * @desc    Health check for predictive service
 * @access  Public
 */
router.get('/health', predictiveController.predictiveHealthCheck);

module.exports = router;