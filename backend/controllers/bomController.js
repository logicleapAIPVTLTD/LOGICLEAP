const { validationResult } = require('express-validator');
const pythonService = require('../services/pythonService');
const path = require('path');
const fs = require('fs').promises;

class BOMController {
  
  // Predict BOM using default data file
  async predictBOM(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const { userWork, length, breadth, projectDays = 10, tankCapacity = null } = req.body;

      console.log('Predicting BOM for:', { userWork, length, breadth, projectDays });
      if (tankCapacity) {
        console.log('Tank capacity provided:', tankCapacity);
      }

      // Call Python service
      const result = await pythonService.executeBOMPrediction({
        userWork,
        length,
        breadth,
        projectDays,
        tankCapacity: tankCapacity || null
      });

      res.status(200).json({
        status: 'success',
        data: result
      });

    } catch (error) {
      console.error('Error in predictBOM:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to generate BOM prediction'
      });
    }
  }

  // Predict BOM using custom uploaded data file
  async predictBOMWithFile(req, res) {
    let uploadedFilePath = null;
    
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No data file uploaded'
        });
      }

      uploadedFilePath = req.file.path;
      const { userWork, length, breadth, projectDays = 10, tankCapacity = null } = req.body;

      console.log('Predicting BOM with custom file:', req.file.filename);
      if (tankCapacity) {
        console.log('Tank capacity provided:', tankCapacity);
      }

      // Call Python service with custom file
      const result = await pythonService.executeBOMPrediction({
        userWork,
        length,
        breadth,
        projectDays,
        tankCapacity: tankCapacity || null,
        customDataFile: uploadedFilePath
      });

      // Clean up uploaded file
      await fs.unlink(uploadedFilePath);

      res.status(200).json({
        status: 'success',
        data: result
      });

    } catch (error) {
      console.error('Error in predictBOMWithFile:', error);
      
      // Clean up uploaded file on error
      if (uploadedFilePath) {
        try {
          await fs.unlink(uploadedFilePath);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }

      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to generate BOM prediction'
      });
    }
  }

  // Get all available work types
  async getWorkTypes(req, res) {
    try {
      const workTypes = await pythonService.getWorkTypes();
      
      res.status(200).json({
        status: 'success',
        data: workTypes
      });

    } catch (error) {
      console.error('Error in getWorkTypes:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve work types'
      });
    }
  }

  // Get all available domains
  async getDomains(req, res) {
    try {
      const domains = await pythonService.getDomains();
      
      res.status(200).json({
        status: 'success',
        data: domains
      });

    } catch (error) {
      console.error('Error in getDomains:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve domains'
      });
    }
  }

  // Health check for BOM system
  async healthCheck(req, res) {
    try {
      const health = await pythonService.checkHealth();
      
      res.status(200).json({
        status: 'success',
        data: health
      });

    } catch (error) {
      console.error('Error in healthCheck:', error);
      res.status(500).json({
        status: 'error',
        message: 'Health check failed'
      });
    }
  }
}

module.exports = new BOMController();