const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/config');

class EstimationService {

  /**
   * Calculate price estimation
   */
  async calculateEstimation(params) {
    // const { stateCode, cityTier, bomFile } = params;
    const { stateCode, cityTier, bomFiles } = params;

    return new Promise((resolve, reject) => {
      const rateScriptPath = path.join(__dirname, '../python', 'rate.py');

      // const args = [
      //   rateScriptPath,
      //   '--state', stateCode,
      //   '--tier', cityTier,
      //   '--bom-file', bomFile
      // ];
      const args = [
        rateScriptPath,
        '--state', stateCode,
        '--tier', cityTier,
        '--bom-file', bomFiles?.[0] || 'predicted_bom.xlsx'
      ];

      console.log('Executing rate.py with args:', args);

      const pythonProcess = spawn(config.pythonExecutable, args, {
        cwd: path.join(__dirname, '../python')
      });

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
        console.log('Python stdout:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python process exited with code:', code);
          return reject(new Error(`Rate calculation failed: ${errorData}`));
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (parseError) {
          console.error('Failed to parse Python output:', outputData);
          reject(new Error('Failed to parse estimation results'));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Failed to execute rate script: ${error.message}`));
      });
    });
  }

  /**
   * Get detailed breakdown
   */
  async getDetailedBreakdown(params) {
    const { stateCode, cityTier, bomFile } = params;

    return new Promise((resolve, reject) => {
      const rateScriptPath = path.join(__dirname, '../python', 'rate.py');

      const args = [
        rateScriptPath,
        '--state', stateCode,
        '--tier', cityTier,
        '--bom-file', bomFile,
        '--detailed'
      ];

      console.log('Executing rate.py for detailed breakdown:', args);

      const pythonProcess = spawn(config.pythonExecutable, args, {
        cwd: path.join(__dirname, '../python')
      });

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Breakdown calculation failed: ${errorData}`));
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (parseError) {
          reject(new Error('Failed to parse breakdown results'));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to execute rate script: ${error.message}`));
      });
    });
  }

  /**
   * Get available locations
   */
  async getAvailableLocations() {
    return new Promise((resolve, reject) => {
      const rateScriptPath = path.join(__dirname, '../python', 'rate.py');
      const args = [rateScriptPath, '--get-locations'];

      const pythonProcess = spawn(config.pythonExecutable, args, {
        cwd: path.join(__dirname, '../python')
      });

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Failed to get locations: ${errorData}`));
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (parseError) {
          reject(new Error('Failed to parse locations'));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to execute rate script: ${error.message}`));
      });
    });
  }

  /**
   * Validate master data files
   */
  async validateMasterFiles() {
    return new Promise((resolve, reject) => {
      const rateScriptPath = path.join(__dirname, '../python', 'rate.py');
      const args = [rateScriptPath, '--validate'];

      const pythonProcess = spawn(config.pythonExecutable, args, {
        cwd: path.join(__dirname, '../python')
      });

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Validation failed: ${errorData}`));
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (parseError) {
          reject(new Error('Failed to parse validation results'));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to execute rate script: ${error.message}`));
      });
    });
  }
}

module.exports = new EstimationService();