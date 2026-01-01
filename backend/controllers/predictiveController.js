const { spawn } = require('child_process');
const path = require('path');

// Path to Python Predictive script
const PREDICTIVE_SCRIPT = path.join(__dirname, '../python/predictive_api.py');
const PYTHON_EXECUTABLE = process.env.PYTHON_PATH || 'python';

/**
 * Execute Python Predictive script
 */
const executePredictiveScript = (scriptPath, args = []) => {
  return new Promise((resolve, reject) => {
    const python = spawn(PYTHON_EXECUTABLE, [scriptPath, ...args], {
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
 * Build features from CSV data
 */
exports.buildFeatures = async (req, res) => {
  try {
    const result = await executePredictiveScript(PREDICTIVE_SCRIPT, ['build']);

    res.status(200).json({
      success: true,
      message: 'Features built successfully',
      data: result
    });

  } catch (error) {
    console.error('Error building features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to build features',
      error: error.message
    });
  }
};

/**
 * Train all predictive models
 */
exports.trainModels = async (req, res) => {
  try {
    const result = await executePredictiveScript(PREDICTIVE_SCRIPT, ['train']);

    res.status(200).json({
      success: true,
      message: 'Models trained successfully',
      data: result
    });

  } catch (error) {
    console.error('Error training models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to train models',
      error: error.message
    });
  }
};

/**
 * Predict using specific model
 */
exports.predict = async (req, res) => {
  try {
    const { model_type, features } = req.body;

    if (!model_type) {
      return res.status(400).json({
        success: false,
        message: 'model_type is required (delay, cost, completion, profit)'
      });
    }

    if (!features || typeof features !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'features object is required'
      });
    }

    const payload = { model_type, features };

    const result = await executePredictiveScript(PREDICTIVE_SCRIPT, [
      'predict',
      JSON.stringify(payload)
    ]);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error making prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to make prediction',
      error: error.message
    });
  }
};

/**
 * Predict using all models
 */
exports.predictAll = async (req, res) => {
  try {
    const { features } = req.body;

    if (!features || typeof features !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'features object is required'
      });
    }

    const payload = { features };

    const result = await executePredictiveScript(PREDICTIVE_SCRIPT, [
      'predict_all',
      JSON.stringify(payload)
    ]);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error making predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to make predictions',
      error: error.message
    });
  }
};

/**
 * Health check for predictive service
 */
exports.predictiveHealthCheck = async (req, res) => {
  try {
    const result = await executePredictiveScript(PREDICTIVE_SCRIPT, ['health']);

    res.status(200).json({
      success: true,
      message: 'Predictive service is running',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Predictive service health check failed',
      error: error.message
    });
  }
};