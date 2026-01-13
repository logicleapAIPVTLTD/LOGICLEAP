// backend/routes/continuousLearningRoutes.js
const express = require('express');
const router = express.Router();
const continuousLearningController = require('../controllers/continuousLearningController');

// Optional: Add authentication middleware
// const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/continuous-learning/health
 * @desc    Check Python service health
 * @access  Public
 */
router.get('/health', continuousLearningController.checkHealth);

/**
 * @route   POST /api/continuous-learning/feedback
 * @desc    Submit feedback for a BOQ
 * @access  Private (add authenticate middleware if needed)
 */
router.post('/feedback', continuousLearningController.submitFeedback);

/**
 * @route   GET /api/continuous-learning/feedback
 * @desc    Get all feedback records
 * @access  Private
 */
router.get('/feedback', continuousLearningController.getAllFeedback);

/**
 * @route   GET /api/continuous-learning/dashboard
 * @desc    Get dashboard metrics for active model
 * @access  Private
 */
router.get('/dashboard', continuousLearningController.getDashboard);

/**
 * @route   GET /api/continuous-learning/retrain
 * @desc    Get retraining decision for active model
 * @access  Private
 */
router.get('/retrain', continuousLearningController.getRetrainingDecision);

module.exports = router;