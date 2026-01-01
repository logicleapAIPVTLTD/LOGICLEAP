const { spawn } = require('child_process');
const path = require('path');

// Path to Python BOQ Cleaning script
const BOQ_CLEANING_SCRIPT = path.join(__dirname, '../python/boq_cleaning_api.py');
const PYTHON_EXECUTABLE = process.env.PYTHON_PATH || 'python';

/**
 * Execute Python BOQ Cleaning script
 */
const executeBOQCleaningScript = (scriptPath, args = []) => {
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
 * Extract entities from single text
 */
exports.extractEntities = async (req, res) => {
  try {
    const { text, source_type, channel, save_to_db } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    const payload = {
      text,
      source_type: source_type || 'api',
      channel: channel || 'http',
      save_to_db: save_to_db || false
    };

    const result = await executeBOQCleaningScript(BOQ_CLEANING_SCRIPT, [
      'extract',
      JSON.stringify(payload)
    ]);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error extracting entities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract entities',
      error: error.message
    });
  }
};

/**
 * Extract entities from multiple texts (batch)
 */
exports.extractBatchEntities = async (req, res) => {
  try {
    const { texts, source_type, channel, save_to_db } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Texts array is required and must not be empty'
      });
    }

    const payload = {
      texts,
      source_type: source_type || 'api',
      channel: channel || 'http',
      save_to_db: save_to_db || false
    };

    const result = await executeBOQCleaningScript(BOQ_CLEANING_SCRIPT, [
      'batch',
      JSON.stringify(payload)
    ]);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error extracting batch entities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract batch entities',
      error: error.message
    });
  }
};

/**
 * Health check for BOQ cleaning service
 */
exports.cleaningHealthCheck = async (req, res) => {
  try {
    const result = await executeBOQCleaningScript(BOQ_CLEANING_SCRIPT, ['health']);

    res.status(200).json({
      success: true,
      message: 'BOQ cleaning service is running',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'BOQ cleaning service health check failed',
      error: error.message
    });
  }
};