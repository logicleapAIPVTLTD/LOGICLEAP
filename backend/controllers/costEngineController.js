// backend/controllers/costEngineController.js
const { spawn } = require('child_process');
const path = require('path');

/**
 * Execute Cost Engine script
 */
const executeCostScript = (bomData) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path.join(__dirname, '../python/cost_engine.py');
    
    const pythonProcess = spawn(pythonPath, [scriptPath, JSON.stringify(bomData)]);
    
    let dataBuffer = '';
    let errorBuffer = '';
    
    pythonProcess.stdout.on('data', (data) => {
      dataBuffer += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorBuffer += data.toString();
      console.error(`Python Error: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Cost script exited with code ${code}: ${errorBuffer}`));
        return;
      }
      
      try {
        const result = JSON.parse(dataBuffer);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse Cost output: ${parseError.message}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
    
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Cost script execution timeout'));
    }, 300000); // 5 minutes timeout
  });
};

/**
 * POST /api/cost-engine/estimate
 * Generate cost estimate from BOM data
 */
const getCostEstimate = async (req, res) => {
  try {
    const { bomData } = req.body;

    // Validation
    if (!bomData || !Array.isArray(bomData) || bomData.length === 0) {
      return res.status(400).json({
        success: false,
        error: "BOM data is required and must be a non-empty array",
      });
    }

    console.log(`Generating cost estimate for ${bomData.length} BOM items`);

    const result = await executeCostScript(bomData);

    return res.status(200).json({
      success: true,
      message: "Cost estimate generated successfully",
      data: result,
      summary: {
        totalItems: result.length,
      },
    });
  } catch (error) {
    console.error("Error generating cost estimate:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * POST /api/cost-engine/estimate/detailed
 * Generate detailed cost estimate
 */
const getDetailedEstimate = async (req, res) => {
  // For now, same as getCostEstimate
  return getCostEstimate(req, res);
};

/**
 * POST /api/cost-engine/estimate/batch
 * Generate cost estimates for multiple BOMs
 */
const getBatchCostEstimate = async (req, res) => {
  try {
    const { bomList } = req.body;

    // Validation
    if (!bomList || !Array.isArray(bomList) || bomList.length === 0) {
      return res.status(400).json({
        success: false,
        error: "BOM list is required and must be a non-empty array",
      });
    }

    const results = [];

    for (const bomData of bomList) {
      try {
        const result = await executeCostScript(bomData);
        results.push({
          success: true,
          data: result,
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Batch cost estimates completed",
      results: results,
    });
  } catch (error) {
    console.error("Error in batch cost estimate:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * GET /api/cost-engine/health
 * Health check
 */
const checkHealth = async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, "../python/cost_engine.py");

    // Check if script exists
    const fs = require('fs').promises;
    await fs.access(scriptPath);

    return res.status(200).json({
      success: true,
      message: "Cost engine service is healthy",
      data: {
        scriptPath: scriptPath,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Cost engine health check failed",
      details: error.message,
    });
  }
};

/**
 * GET /api/cost-engine/info
 * Service info
 */
const getServiceInfo = async (req, res) => {
  return res.status(200).json({
    success: true,
    service: "Cost Engine",
    version: "1.0",
    description: "AI-powered cost estimation for construction materials",
  });
};

module.exports = {
  getCostEstimate,
  getDetailedEstimate,
  getBatchCostEstimate,
  checkHealth,
  getServiceInfo,
};
