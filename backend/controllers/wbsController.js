const { spawn } = require('child_process');
const path = require('path');



// Path to Python WBS script
const WBS_SCRIPT = path.join(__dirname, '../python/wbs_api.py');
const PYTHON_EXECUTABLE = process.env.PYTHON_PATH || 'python';

/**
 * Execute Python WBS script
 */
const executeWBSScript = (scriptPath, args = []) => {
  return new Promise((resolve, reject) => {
    const python = spawn("python", [WBS_SCRIPT, ...args], {
      env: {
        ...process.env
      }
    });

    let dataString = '';
    let errorString = '';

    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${errorString}`));
        return;
      }

      try {
        const result = JSON.parse(dataString);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error.message}\nOutput: ${dataString}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};

/**
 * Generate WBS from BOQ payload
 */
exports.generateWBS = async (req, res) => {
  try {
    const payload = req.body;

    // Validate required fields
    if (!payload.boq_text) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: boq_text is required'
      });
    }

    // Set defaults for optional fields
    const wbsPayload = {
      boq_text: payload.boq_text,
      quantity: payload.quantity || 1.0,
      region: payload.region || 'central',
      season: payload.season || 'normal',
      grade: payload.grade || 'B',
      rate_most: payload.rate_most || 0.0,
      rate_min: payload.rate_min || 0.0,
      rate_max: payload.rate_max || 0.0,
      confidence: payload.confidence || 1.0,
      subcategory: payload.subcategory || null
    };

    // Pass payload as JSON string argument
    const result = await executeWBSScript(WBS_SCRIPT, [
      'generate',
      JSON.stringify(wbsPayload)
    ]);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error generating WBS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate WBS',
      error: error.message
    });
  }
};

/**
 * Generate WBS for multiple BOQ items (batch)
 */
exports.generateBatchWBS = async (req, res) => {
  try {
    const { boqs } = req.body;

    if (!Array.isArray(boqs) || boqs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'boqs array is required and must not be empty'
      });
    }

    const results = [];

    for (const boq of boqs) {
      try {
        const wbsPayload = {
          boq_text: boq.boq_text,
          quantity: boq.quantity || 1.0,
          region: boq.region || 'central',
          season: boq.season || 'normal',
          grade: boq.grade || 'B',
          rate_most: boq.rate_most || 0.0,
          rate_min: boq.rate_min || 0.0,
          rate_max: boq.rate_max || 0.0,
          confidence: boq.confidence || 1.0,
          subcategory: boq.subcategory || null
        };

        const result = await executeWBSScript(WBS_SCRIPT, [
          'generate',
          JSON.stringify(wbsPayload)
        ]);

        results.push({
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          boq_text: boq.boq_text
        });
      }
    }

    res.status(200).json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('Error generating batch WBS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate batch WBS',
      error: error.message
    });
  }
};

/**
 * Health check for WBS service
 */
exports.wbsHealthCheck = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'WBS service is running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'WBS service health check failed',
      error: error.message
    });
  }
};