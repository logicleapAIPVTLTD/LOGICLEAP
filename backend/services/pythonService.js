// const { spawn } = require('child_process');
// const path = require('path');
// const fs = require('fs').promises;
// const config = require('../config/config');

// class PythonService {
  
//   /**
//    * Execute Python BOM prediction script
//    */
//   async executeBOMPrediction(params) {
//     const { userWork, length, breadth, projectDays, tankCapacity, customDataFile } = params;

//     return new Promise((resolve, reject) => {
//       const args = [
//         config.pythonScriptPath,
//         '--user-work', userWork,
//         '--length', length.toString(),
//         '--breadth', breadth.toString(),
//         '--project-days', projectDays.toString()
//       ];

//       // Add tank capacity if provided
//       if (tankCapacity) {
//         args.push('--tank-capacity', tankCapacity.toString());
//       }

//       // Add custom data file if provided
//       if (customDataFile) {
//         args.push('--data-file', customDataFile);
//       }

//       console.log('Executing Python script with args:', args);

//     //   const pythonProcess = spawn(config.pythonExecutable, args);
//     const pythonProcess = spawn(
//   config.pythonExecutable,
//   ['-3.13', ...args]
// );

      
//       let outputData = '';
//       let errorData = '';

//       pythonProcess.stdout.on('data', (data) => {
//         outputData += data.toString();
//         console.log('Python stdout:', data.toString());
//       });

//       pythonProcess.stderr.on('data', (data) => {
//         errorData += data.toString();
//         console.error('Python stderr:', data.toString());
//       });

//       pythonProcess.on('close', (code) => {
//         if (code !== 0) {
//           console.error('Python process exited with code:', code);
//           return reject(new Error(`Python script failed: ${errorData}`));
//         }

//         try {
//           // Parse JSON output from Python script
//           const result = JSON.parse(outputData);
//           resolve(result);
//         } catch (parseError) {
//           console.error('Failed to parse Python output:', outputData);
//           reject(new Error('Failed to parse prediction results'));
//         }
//       });

//       pythonProcess.on('error', (error) => {
//         console.error('Failed to start Python process:', error);
//         reject(new Error(`Failed to execute Python script: ${error.message}`));
//       });
//     });
//   }

//   /**
//    * Get all available work types
//    */
//   async getWorkTypes() {
//     return new Promise((resolve, reject) => {
//       const args = [config.pythonScriptPath, '--get-work-types'];
      
//       const pythonProcess = spawn(config.pythonExecutable, args);
//       let outputData = '';
//       let errorData = '';

//       pythonProcess.stdout.on('data', (data) => {
//         outputData += data.toString();
//       });

//       pythonProcess.stderr.on('data', (data) => {
//         errorData += data.toString();
//       });

//       pythonProcess.on('close', (code) => {
//         if (code !== 0) {
//           return reject(new Error(`Failed to get work types: ${errorData}`));
//         }

//         try {
//           const result = JSON.parse(outputData);
//           resolve(result.work_types || []);
//         } catch (parseError) {
//           reject(new Error('Failed to parse work types'));
//         }
//       });

//       pythonProcess.on('error', (error) => {
//         reject(new Error(`Failed to execute Python script: ${error.message}`));
//       });
//     });
//   }

//   /**
//    * Get all available domains
//    */
//   async getDomains() {
//     return new Promise((resolve, reject) => {
//       const args = [config.pythonScriptPath, '--get-domains'];
      
//       const pythonProcess = spawn(config.pythonExecutable, args);
//       let outputData = '';
//       let errorData = '';

//       pythonProcess.stdout.on('data', (data) => {
//         outputData += data.toString();
//       });

//       pythonProcess.stderr.on('data', (data) => {
//         errorData += data.toString();
//       });

//       pythonProcess.on('close', (code) => {
//         if (code !== 0) {
//           return reject(new Error(`Failed to get domains: ${errorData}`));
//         }

//         try {
//           const result = JSON.parse(outputData);
//           resolve(result.domains || []);
//         } catch (parseError) {
//           reject(new Error('Failed to parse domains'));
//         }
//       });

//       pythonProcess.on('error', (error) => {
//         reject(new Error(`Failed to execute Python script: ${error.message}`));
//       });
//     });
//   }

//   /**
//    * Check Python environment health
//    */
//   async checkHealth() {
//     return new Promise((resolve, reject) => {
//       const args = [config.pythonScriptPath, '--health-check'];
      
//       const pythonProcess = spawn(config.pythonExecutable, args);
//       let outputData = '';
//       let errorData = '';

//       pythonProcess.stdout.on('data', (data) => {
//         outputData += data.toString();
//       });

//       pythonProcess.stderr.on('data', (data) => {
//         errorData += data.toString();
//       });

//       pythonProcess.on('close', (code) => {
//         if (code !== 0) {
//           return reject(new Error(`Health check failed: ${errorData}`));
//         }

//         try {
//           const result = JSON.parse(outputData);
//           resolve(result);
//         } catch (parseError) {
//           reject(new Error('Failed to parse health check results'));
//         }
//       });

//       pythonProcess.on('error', (error) => {
//         reject(new Error(`Python environment not accessible: ${error.message}`));
//       });
//     });
//   }
// }

// module.exports = new PythonService();


const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/config');

class PythonService {
  
  // ============================================================
  // BOM PREDICTION METHODS
  // ============================================================
  
  /**
   * Execute Python BOM prediction script
   */
  async executeBOMPrediction(params) {
    const { userWork, length, breadth, projectDays, tankCapacity, customDataFile } = params;

    return new Promise((resolve, reject) => {
      const args = [
        config.pythonScriptPath,
        '--user-work', userWork,
        '--length', length.toString(),
        '--breadth', breadth.toString(),
        '--project-days', projectDays.toString()
      ];

      // Add tank capacity if provided
      if (tankCapacity) {
        args.push('--tank-capacity', tankCapacity.toString());
      }

      // Add custom data file if provided
      if (customDataFile) {
        args.push('--data-file', customDataFile);
      }

      console.log('Executing Python script with args:', args);

      const pythonProcess = spawn(config.pythonExecutable, args);
      
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
          return reject(new Error(`Python script failed: ${errorData}`));
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (parseError) {
          console.error('Failed to parse Python output:', outputData);
          reject(new Error('Failed to parse prediction results'));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Failed to execute Python script: ${error.message}`));
      });
    });
  }

  /**
   * Get all available work types
   */
  async getWorkTypes() {
    return new Promise((resolve, reject) => {
      const args = [config.pythonScriptPath, '--get-work-types'];
      
      const pythonProcess = spawn(config.pythonExecutable, args);
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
          return reject(new Error(`Failed to get work types: ${errorData}`));
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result.work_types || []);
        } catch (parseError) {
          reject(new Error('Failed to parse work types'));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to execute Python script: ${error.message}`));
      });
    });
  }

  /**
   * Get all available domains
   */
  async getDomains() {
    return new Promise((resolve, reject) => {
      const args = [config.pythonScriptPath, '--get-domains'];
      
      const pythonProcess = spawn(config.pythonExecutable, args);
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
          return reject(new Error(`Failed to get domains: ${errorData}`));
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result.domains || []);
        } catch (parseError) {
          reject(new Error('Failed to parse domains'));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to execute Python script: ${error.message}`));
      });
    });
  }

  // ============================================================
  // ESTIMATION METHODS
  // ============================================================

  /**
   * Calculate price estimation
   */
  async calculateEstimation(params) {
    const { stateCode, cityTier, bomFile } = params;

    return new Promise((resolve, reject) => {
      const rateScriptPath = path.join(__dirname, '../python', 'rate.py');
      
      const args = [
        rateScriptPath,
        '--state', stateCode,
        '--tier', cityTier
      ];

      if (bomFile) {
        args.push('--bom-file', bomFile);
      }

      console.log('Executing rate.py with args:', args);

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
        '--detailed'
      ];

      if (bomFile) {
        args.push('--bom-file', bomFile);
      }

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

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  /**
   * Check Python environment health
   */
  async checkHealth() {
    return new Promise((resolve, reject) => {
      const args = [config.pythonScriptPath, '--health-check'];
      
      const pythonProcess = spawn(config.pythonExecutable, args);
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
          return reject(new Error(`Health check failed: ${errorData}`));
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (parseError) {
          reject(new Error('Failed to parse health check results'));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Python environment not accessible: ${error.message}`));
      });
    });
  }
}

module.exports = new PythonService();