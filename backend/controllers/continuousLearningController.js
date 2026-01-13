// backend/controllers/continuousLearningController.js
const axios = require('axios');

// Python service URL - update this based on your deployment
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

class ContinuousLearningController {
  /**
   * Submit feedback for a BOQ
   * POST /api/continuous-learning/feedback
   */
  async submitFeedback(req, res) {
    try {
      const { boq_id } = req.body;

      if (!boq_id) {
        return res.status(400).json({
          success: false,
          message: 'boq_id is required'
        });
      }

      // Call Python service
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/feedback`,
        { boq_id },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000 // 30 second timeout
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: response.data
      });

    } catch (error) {
      console.error('Error submitting feedback:', error.message);
      
      if (error.response) {
        // Python service returned an error
        return res.status(error.response.status).json({
          success: false,
          message: error.response.data.detail || 'Error from continuous learning service',
          error: error.response.data
        });
      } else if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: 'Continuous learning service is unavailable'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get all feedback records
   * GET /api/continuous-learning/feedback
   */
  async getAllFeedback(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;

      const response = await axios.get(
        `${PYTHON_SERVICE_URL}/feedback/all`,
        {
          params: { limit },
          timeout: 30000
        }
      );

      return res.status(200).json({
        success: true,
        data: response.data,
        count: response.data.length
      });

    } catch (error) {
      console.error('Error fetching feedback:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          message: 'Error fetching feedback',
          error: error.response.data
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get dashboard metrics for active model
   * GET /api/continuous-learning/dashboard
   */
  async getDashboard(req, res) {
    try {
      const response = await axios.get(
        `${PYTHON_SERVICE_URL}/dashboard`,
        { timeout: 30000 }
      );

      return res.status(200).json({
        success: true,
        data: response.data
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          message: 'Error fetching dashboard metrics',
          error: error.response.data
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get retraining decision for active model
   * GET /api/continuous-learning/retrain
   */
  async getRetrainingDecision(req, res) {
    try {
      const response = await axios.get(
        `${PYTHON_SERVICE_URL}/retrain`,
        { timeout: 30000 }
      );

      return res.status(200).json({
        success: true,
        data: response.data
      });

    } catch (error) {
      console.error('Error fetching retraining decision:', error.message);
      
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          message: 'Error fetching retraining decision',
          error: error.response.data
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Health check for Python service
   * GET /api/continuous-learning/health
   */
  async checkHealth(req, res) {
    try {
      const response = await axios.get(
        `${PYTHON_SERVICE_URL}/`,
        { timeout: 5000 }
      );

      return res.status(200).json({
        success: true,
        message: 'Continuous learning service is healthy',
        data: response.data
      });

    } catch (error) {
      return res.status(503).json({
        success: false,
        message: 'Continuous learning service is unavailable',
        error: error.message
      });
    }
  }
}

module.exports = new ContinuousLearningController();