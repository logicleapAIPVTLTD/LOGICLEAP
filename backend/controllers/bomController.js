// const { validationResult } = require('express-validator');
// const pythonService = require('../services/pythonService');
// const path = require('path');
// const fs = require('fs').promises;

// class BOMController {

//   // Predict BOM using default data file
//   async predictBOM(req, res) {
//     try {
//       // Validate request
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({
//           status: 'error',
//           errors: errors.array()
//         });
//       }

//       const { userWork, length, breadth, projectDays = 10, tankCapacity = null } = req.body;

//       console.log('Predicting BOM for:', { userWork, length, breadth, projectDays });
//       if (tankCapacity) {
//         console.log('Tank capacity provided:', tankCapacity);
//       }

//       // Call Python service
//       const result = await pythonService.executeBOMPrediction({
//         userWork,
//         length,
//         breadth,
//         projectDays,
//         tankCapacity: tankCapacity || null
//       });

//       res.status(200).json({
//         status: 'success',
//         data: result
//       });

//     } catch (error) {
//       console.error('Error in predictBOM:', error);
//       res.status(500).json({
//         status: 'error',
//         message: error.message || 'Failed to generate BOM prediction'
//       });
//     }
//   }

//   // Predict BOM using custom uploaded data file
//   async predictBOMWithFile(req, res) {
//     let uploadedFilePath = null;

//     try {
//       // Validate request
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({
//           status: 'error',
//           errors: errors.array()
//         });
//       }

//       if (!req.file) {
//         return res.status(400).json({
//           status: 'error',
//           message: 'No data file uploaded'
//         });
//       }

//       uploadedFilePath = req.file.path;
//       const { userWork, length, breadth, projectDays = 10, tankCapacity = null } = req.body;

//       console.log('Predicting BOM with custom file:', req.file.filename);
//       if (tankCapacity) {
//         console.log('Tank capacity provided:', tankCapacity);
//       }

//       // Call Python service with custom file
//       const result = await pythonService.executeBOMPrediction({
//         userWork,
//         length,
//         breadth,
//         projectDays,
//         tankCapacity: tankCapacity || null,
//         customDataFile: uploadedFilePath
//       });

//       // Clean up uploaded file
//       await fs.unlink(uploadedFilePath);

//       res.status(200).json({
//         status: 'success',
//         data: result
//       });

//     } catch (error) {
//       console.error('Error in predictBOMWithFile:', error);

//       // Clean up uploaded file on error
//       if (uploadedFilePath) {
//         try {
//           await fs.unlink(uploadedFilePath);
//         } catch (unlinkError) {
//           console.error('Error deleting uploaded file:', unlinkError);
//         }
//       }

//       res.status(500).json({
//         status: 'error',
//         message: error.message || 'Failed to generate BOM prediction'
//       });
//     }
//   }

//   // Get all available work types
//   async getWorkTypes(req, res) {
//     try {
//       const workTypes = await pythonService.getWorkTypes();

//       res.status(200).json({
//         status: 'success',
//         data: workTypes
//       });

//     } catch (error) {
//       console.error('Error in getWorkTypes:', error);
//       res.status(500).json({
//         status: 'error',
//         message: 'Failed to retrieve work types'
//       });
//     }
//   }

//   // Get all available domains
//   async getDomains(req, res) {
//     try {
//       const domains = await pythonService.getDomains();

//       res.status(200).json({
//         status: 'success',
//         data: domains
//       });

//     } catch (error) {
//       console.error('Error in getDomains:', error);
//       res.status(500).json({
//         status: 'error',
//         message: 'Failed to retrieve domains'
//       });
//     }
//   }

//   // Health check for BOM system
//   async healthCheck(req, res) {
//     try {
//       const health = await pythonService.checkHealth();

//       res.status(200).json({
//         status: 'success',
//         data: health
//       });

//     } catch (error) {
//       console.error('Error in healthCheck:', error);
//       res.status(500).json({
//         status: 'error',
//         message: 'Health check failed'
//       });
//     }
//   }
// }

// module.exports = new BOMController();

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs").promises;

/**
 * Execute Python BOM script and return parsed output
 */
const executeBOMScript = (boqData, projectDays = 15) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../python/bom_api.py");
    const python = spawn("python", [scriptPath]);

    let stdout = "";
    let stderr = "";

    // Send BOQ data via stdin
    const inputData = JSON.stringify({
      boq_data: boqData,
      project_days: projectDays,
    });

    python.stdin.write(inputData);
    python.stdin.end();

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`BOM script exited with code ${code}: ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(
            new Error(
              `Failed to parse BOM output: ${stdout}\nError: ${error.message}`
            )
          );
        }
      }
    });

    python.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};

/**
 * Generate BOM from BOQ data
 * @route POST /api/bom/generate
 */
const generateBOM = async (req, res) => {
  try {
    const { boqData, projectDays } = req.body;

    // Validation
    if (!boqData || !Array.isArray(boqData) || boqData.length === 0) {
      return res.status(400).json({
        success: false,
        error: "BOQ data is required and must be a non-empty array",
      });
    }

    // Validate BOQ items structure
    const isValid = boqData.every((item) => item.work_name || item.work_code);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: "Each BOQ item must have at least work_name or work_code",
      });
    }

    const days =
      projectDays && !isNaN(projectDays) ? parseInt(projectDays) : 15;

    console.log(
      `📊 Generating BOM for ${boqData.length} BOQ items (${days} days project)`
    );

    const result = await executeBOMScript(boqData, days);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "BOM generated successfully",
        data: result.data,
        summary: {
          totalItems: result.total_items || 0,
          totalMaterials: result.total_materials || 0,
          workTypes: result.work_types || [],
          excelFile: result.excel_file || null,
        },
        metadata: {
          projectDays: days,
          boqItemsProcessed: boqData.length,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Failed to generate BOM",
      });
    }
  } catch (error) {
    console.error("Error generating BOM:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Generate BOM directly from text/file (combined BOQ + BOM)
 * @route POST /api/bom/generate-from-source
 */
const generateBOMFromSource = async (req, res) => {
  try {
    const { text, filePath, mode, projectDays } = req.body;

    if (!text && !filePath) {
      return res.status(400).json({
        success: false,
        error: "Either text or filePath is required",
      });
    }

    // Step 1: Generate BOQ first
    const boqScript = path.join(__dirname, "../python/boq_api.py");
    const boqPython = spawn("python", [boqScript]);

    const boqInput = JSON.stringify({
      mode: mode || "1",
      input: text || filePath,
    });

    let boqOutput = "";
    let boqError = "";

    boqPython.stdin.write(boqInput);
    boqPython.stdin.end();

    await new Promise((resolve, reject) => {
      boqPython.stdout.on("data", (data) => {
        boqOutput += data.toString();
      });

      boqPython.stderr.on("data", (data) => {
        boqError += data.toString();
      });

      boqPython.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`BOQ generation failed: ${boqError}`));
        } else {
          resolve();
        }
      });
    });

    const boqResult = JSON.parse(boqOutput);

    if (!boqResult.success || !boqResult.data || boqResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No BOQ items generated from input",
        boqError: boqResult.error,
      });
    }

    // Step 2: Generate BOM from BOQ
    const days =
      projectDays && !isNaN(projectDays) ? parseInt(projectDays) : 15;
    const bomResult = await executeBOMScript(boqResult.data, days);

    if (bomResult.success) {
      return res.status(200).json({
        success: true,
        message: "BOQ and BOM generated successfully",
        boq: {
          count: boqResult.data.length,
          items: boqResult.data,
        },
        bom: {
          data: bomResult.data,
          summary: {
            totalItems: bomResult.total_items || 0,
            totalMaterials: bomResult.total_materials || 0,
            workTypes: bomResult.work_types || [],
          },
        },
        metadata: {
          projectDays: days,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "BOM generation failed",
        bomError: bomResult.error,
        boqData: boqResult.data,
      });
    }
  } catch (error) {
    console.error("Error in combined generation:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Download generated BOM Excel file
 * @route GET /api/bom/download/:filename
 */
const downloadBOM = async (req, res) => {
  try {
    const { filename } = req.params;

    // Security: Only allow specific filename pattern
    if (!filename.match(/^Final_Project_BOM_\d+\.xlsx$/)) {
      return res.status(400).json({
        success: false,
        error: "Invalid filename",
      });
    }

    const filePath = path.join(__dirname, "../python", filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            error: "Error downloading file",
          });
        }
      }

      // Optional: Delete file after download
      fs.unlink(filePath).catch(console.error);
    });
  } catch (error) {
    console.error("Error in download:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Get BOM master data statistics
 * @route GET /api/bom/master-stats
 */
const getMasterStats = async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, "../python/bom_api.py");
    const python = spawn("python", [scriptPath, "stats"]);

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    await new Promise((resolve, reject) => {
      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Stats script failed: ${stderr}`));
        } else {
          resolve();
        }
      });
    });

    const stats = JSON.parse(stdout);

    return res.status(200).json({
      success: true,
      message: "Master data statistics retrieved",
      data: stats,
    });
  } catch (error) {
    console.error("Error getting master stats:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Test work type matching
 * @route POST /api/bom/test-match
 */
const testWorkTypeMatch = async (req, res) => {
  try {
    const { workName } = req.body;

    if (!workName || typeof workName !== "string") {
      return res.status(400).json({
        success: false,
        error: "Work name is required",
      });
    }

    const scriptPath = path.join(__dirname, "../python/bom_api.py");
    const python = spawn("python", [scriptPath, "test-match"]);

    python.stdin.write(JSON.stringify({ work_name: workName }));
    python.stdin.end();

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    await new Promise((resolve, reject) => {
      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Match test failed: ${stderr}`));
        } else {
          resolve();
        }
      });
    });

    const result = JSON.parse(stdout);

    return res.status(200).json({
      success: true,
      message: "Work type matching test completed",
      data: {
        inputWorkName: workName,
        matchedWorkType: result.matched_type,
        confidenceScore: result.score,
        alternatives: result.alternatives || [],
      },
    });
  } catch (error) {
    console.error("Error testing match:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Health check for BOM service
 * @route GET /api/bom/health
 */
const healthCheck = async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, "../python/bom_api.py");

    // Check if Python script exists
    await fs.access(scriptPath);

    // Test DynamoDB connection
    const python = spawn("python", [scriptPath, "health"]);
    let stdout = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    await new Promise((resolve) => {
      python.on("close", () => resolve());
    });

    const health = JSON.parse(stdout || "{}");

    return res.status(200).json({
      success: true,
      message: "BOM service is healthy",
      data: {
        scriptPath: scriptPath,
        dynamoDBConnected: health.db_connected || false,
        masterDataLoaded: health.master_loaded || false,
        totalWorkTypes: health.work_types_count || 0,
        totalMaterials: health.materials_count || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "BOM service health check failed",
      details: error.message,
    });
  }
};

module.exports = {
  generateBOM,
  generateBOMFromSource,
  downloadBOM,
  getMasterStats,
  testWorkTypeMatch,
  healthCheck,
};
