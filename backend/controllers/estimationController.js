const estimationService = require('../services/estimationService');
const path = require('path');

class EstimationController {
  /**
   * Calculate price estimation based on BOM
   */
  async calculateEstimation(req, res, next) {
    try {
      // const { stateCode, cityTier, bomFile } = req.body;
      const { stateCode, cityTier, bomFile, bomFiles } = req.body;                         ///new changed line


      // Validation
      if (!stateCode || !cityTier) {
        return res.status(400).json({
          status: 'error',
          message: 'State code and city tier are required'
        });
      }

      // Use provided BOM file or default
      // const bomFilePath = bomFile || 'predicted_bom.xlsx';

      // const result = await estimationService.calculateEstimation({
      //   stateCode: stateCode.toUpperCase(),
      //   cityTier: cityTier.toUpperCase(),
      //   bomFile: bomFilePath
      // });
      let bomFilePaths = [];

      if (Array.isArray(bomFiles) && bomFiles.length > 0) {
        bomFilePaths = bomFiles;
      } else if (bomFile) {
        bomFilePaths = [bomFile];
      } else {
        bomFilePaths = ['predicted_bom.xlsx'];
      }

      const result = await estimationService.calculateEstimation({
        stateCode: stateCode.toUpperCase(),
        cityTier: cityTier.toUpperCase(),
        bomFiles: bomFilePaths   
      });


      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Estimation calculation error:', error);
      next(error);
    }
  }

  /**
   * Get available states and tiers
   */
  async getLocations(req, res, next) {
    try {
      const locations = await estimationService.getAvailableLocations();

      res.status(200).json({
        status: 'success',
        data: locations
      });
    } catch (error) {
      console.error('Get locations error:', error);
      next(error);
    }
  }

  /**
   * Get estimation breakdown details
   */
  async getEstimationBreakdown(req, res, next) {
    try {
      const { stateCode, cityTier, bomFile } = req.body;

      if (!stateCode || !cityTier) {
        return res.status(400).json({
          status: 'error',
          message: 'State code and city tier are required'
        });
      }

      const bomFilePath = bomFile || 'predicted_bom.xlsx';

      const result = await estimationService.getDetailedBreakdown({
        stateCode: stateCode.toUpperCase(),
        cityTier: cityTier.toUpperCase(),
        bomFile: bomFilePath
      });

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Estimation breakdown error:', error);
      next(error);
    }
  }

  /**
   * Validate master data files
   */
  async validateMasterData(req, res, next) {
    try {
      const validation = await estimationService.validateMasterFiles();

      res.status(200).json({
        status: 'success',
        data: validation
      });
    } catch (error) {
      console.error('Master data validation error:', error);
      next(error);
    }
  }
}

module.exports = new EstimationController();