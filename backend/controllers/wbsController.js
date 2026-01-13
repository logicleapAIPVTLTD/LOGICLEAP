// // const { spawn } = require('child_process');
// // const path = require('path');



// // // Path to Python WBS script
// // const WBS_SCRIPT = path.join(__dirname, '../python/wbs_api.py');
// // const PYTHON_EXECUTABLE = process.env.PYTHON_PATH || 'python';

// // /**
// //  * Execute Python WBS script
// //  */
// // const executeWBSScript = (scriptPath, args = []) => {
// //   return new Promise((resolve, reject) => {
// //     const python = spawn("python", [WBS_SCRIPT, ...args], {
// //       env: {
// //         ...process.env
// //       }
// //     });

// //     let dataString = '';
// //     let errorString = '';

// //     python.stdout.on('data', (data) => {
// //       dataString += data.toString();
// //     });

// //     python.stderr.on('data', (data) => {
// //       errorString += data.toString();
// //     });

// //     python.on('close', (code) => {
// //       if (code !== 0) {
// //         reject(new Error(`Python process exited with code ${code}: ${errorString}`));
// //         return;
// //       }

// //       try {
// //         const result = JSON.parse(dataString);
// //         resolve(result);
// //       } catch (error) {
// //         reject(new Error(`Failed to parse Python output: ${error.message}\nOutput: ${dataString}`));
// //       }
// //     });

// //     python.on('error', (error) => {
// //       reject(new Error(`Failed to start Python process: ${error.message}`));
// //     });
// //   });
// // };

// // /**
// //  * Generate WBS from BOQ payload
// //  */
// // exports.generateWBS = async (req, res) => {
// //   try {
// //     const payload = req.body;

// //     // Validate required fields
// //     if (!payload.boq_text) {
// //       return res.status(400).json({
// //         success: false,
// //         message: 'Invalid payload: boq_text is required'
// //       });
// //     }

// //     // Set defaults for optional fields
// //     const wbsPayload = {
// //       boq_text: payload.boq_text,
// //       quantity: payload.quantity || 1.0,
// //       region: payload.region || 'central',
// //       season: payload.season || 'normal',
// //       grade: payload.grade || 'B',
// //       rate_most: payload.rate_most || 0.0,
// //       rate_min: payload.rate_min || 0.0,
// //       rate_max: payload.rate_max || 0.0,
// //       confidence: payload.confidence || 1.0,
// //       subcategory: payload.subcategory || null
// //     };

// //     // Pass payload as JSON string argument
// //     const result = await executeWBSScript(WBS_SCRIPT, [
// //       'generate',
// //       JSON.stringify(wbsPayload)
// //     ]);

// //     res.status(200).json({
// //       success: true,
// //       data: result
// //     });

// //   } catch (error) {
// //     console.error('Error generating WBS:', error);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Failed to generate WBS',
// //       error: error.message
// //     });
// //   }
// // };

// // /**
// //  * Generate WBS for multiple BOQ items (batch)
// //  */
// // exports.generateBatchWBS = async (req, res) => {
// //   try {
// //     const { boqs } = req.body;

// //     if (!Array.isArray(boqs) || boqs.length === 0) {
// //       return res.status(400).json({
// //         success: false,
// //         message: 'boqs array is required and must not be empty'
// //       });
// //     }

// //     const results = [];

// //     for (const boq of boqs) {
// //       try {
// //         const wbsPayload = {
// //           boq_text: boq.boq_text,
// //           quantity: boq.quantity || 1.0,
// //           region: boq.region || 'central',
// //           season: boq.season || 'normal',
// //           grade: boq.grade || 'B',
// //           rate_most: boq.rate_most || 0.0,
// //           rate_min: boq.rate_min || 0.0,
// //           rate_max: boq.rate_max || 0.0,
// //           confidence: boq.confidence || 1.0,
// //           subcategory: boq.subcategory || null
// //         };

// //         const result = await executeWBSScript(WBS_SCRIPT, [
// //           'generate',
// //           JSON.stringify(wbsPayload)
// //         ]);

// //         results.push({
// //           success: true,
// //           data: result
// //         });
// //       } catch (error) {
// //         results.push({
// //           success: false,
// //           error: error.message,
// //           boq_text: boq.boq_text
// //         });
// //       }
// //     }

// //     res.status(200).json({
// //       success: true,
// //       results: results
// //     });

// //   } catch (error) {
// //     console.error('Error generating batch WBS:', error);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Failed to generate batch WBS',
// //       error: error.message
// //     });
// //   }
// // };

// // /**
// //  * Health check for WBS service
// //  */
// // exports.wbsHealthCheck = async (req, res) => {
// //   try {
// //     res.status(200).json({
// //       success: true,
// //       message: 'WBS service is running',
// //       timestamp: new Date().toISOString()
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: 'WBS service health check failed',
// //       error: error.message
// //     });
// //   }
// // };


// // controllers/wbsController.js
// const { spawn } = require('child_process');
// const path = require('path');

// /**
//  * Execute Python WBS script and return results
//  */
// const executePythonScript = (scriptArgs) => {
//   return new Promise((resolve, reject) => {
//     const pythonPath = process.env.PYTHON_PATH || 'python';
//     const scriptPath = path.join(__dirname, '../python/wbs_api.py');
    
//     // Spawn Python process
//     const pythonProcess = spawn(pythonPath, [scriptPath, JSON.stringify(scriptArgs)]);
    
//     let dataBuffer = '';
//     let errorBuffer = '';
    
//     // Collect stdout data
//     pythonProcess.stdout.on('data', (data) => {
//       dataBuffer += data.toString();
//     });
    
//     // Collect stderr data
//     pythonProcess.stderr.on('data', (data) => {
//       errorBuffer += data.toString();
//       console.error(`Python Error: ${data}`);
//     });
    
//     // Handle process completion
//     pythonProcess.on('close', (code) => {
//       if (code !== 0) {
//         reject(new Error(`Python script exited with code ${code}: ${errorBuffer}`));
//         return;
//       }
      
//       try {
//         const result = JSON.parse(dataBuffer);
//         resolve(result);
//       } catch (parseError) {
//         reject(new Error(`Failed to parse Python output: ${parseError.message}`));
//       }
//     });
    
//     // Handle process errors
//     pythonProcess.on('error', (error) => {
//       reject(new Error(`Failed to start Python process: ${error.message}`));
//     });
    
//     // Set timeout (60 seconds)
//     setTimeout(() => {
//       pythonProcess.kill();
//       reject(new Error('Python script execution timeout'));
//     }, 60000);
//   });
// };

// /**
//  * POST /api/wbs/generate
//  * Generate WBS for a single project
//  */
// exports.generateWBS = async (req, res) => {
//   try {
//     const { work, length, breadth, state, tier } = req.body;
    
//     // Validation
//     if (!work) {
//       return res.status(400).json({
//         success: false,
//         error: 'Work/project description is required'
//       });
//     }
    
//     // Prepare arguments for Python script
//     const scriptArgs = {
//       mode: 'single',
//       work,
//       length: length || null,
//       breadth: breadth || null,
//       state: state || null,
//       tier: tier || null
//     };
    
//     // Execute Python script
//     const result = await executePythonScript(scriptArgs);
    
//     res.json({
//       success: true,
//       data: result
//     });
    
//   } catch (error) {
//     console.error('WBS Generation Error:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to generate WBS'
//     });
//   }
// };

// /**
//  * POST /api/wbs/batch
//  * Generate WBS for multiple projects
//  */
// exports.generateBatchWBS = async (req, res) => {
//   try {
//     const { projects } = req.body;
    
//     // Validation
//     if (!Array.isArray(projects) || projects.length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: 'Projects array is required and must not be empty'
//       });
//     }
    
//     // Validate each project has required fields
//     for (let i = 0; i < projects.length; i++) {
//       if (!projects[i].work) {
//         return res.status(400).json({
//           success: false,
//           error: `Project at index ${i} is missing 'work' field`
//         });
//       }
//     }
    
//     // Prepare arguments for Python script
//     const scriptArgs = {
//       mode: 'batch',
//       projects: projects.map(p => ({
//         work: p.work,
//         length: p.length || null,
//         breadth: p.breadth || null,
//         state: p.state || null,
//         tier: p.tier || null
//       }))
//     };
    
//     // Execute Python script
//     const result = await executePythonScript(scriptArgs);
    
//     res.json({
//       success: true,
//       data: result
//     });
    
//   } catch (error) {
//     console.error('Batch WBS Generation Error:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Failed to generate batch WBS'
//     });
//   }
// };

// /**
//  * GET /api/wbs/health
//  * Check if Python script is accessible
//  */
// exports.healthCheck = async (req, res) => {
//   try {
//     const pythonPath = process.env.PYTHON_PATH || 'python3';
//     const testProcess = spawn(pythonPath, ['--version']);
    
//     testProcess.on('close', (code) => {
//       if (code === 0) {
//         res.json({
//           success: true,
//           message: 'WBS service is healthy',
//           pythonPath
//         });
//       } else {
//         res.status(500).json({
//           success: false,
//           error: 'Python is not properly configured'
//         });
//       }
//     });
    
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

const { spawn } = require('child_process');
const path = require('path');

/**
 * Execute Python WBS script and return results
 */
const executePythonScript = (scriptArgs) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path.join(__dirname, '../python/wbs_api.py');
    
    const pythonProcess = spawn(pythonPath, [scriptPath, JSON.stringify(scriptArgs)]);
    
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
        reject(new Error(`Python script exited with code ${code}: ${errorBuffer}`));
        return;
      }
      
      try {
        const result = JSON.parse(dataBuffer);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse Python output: ${parseError.message}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
    
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python script execution timeout'));
    }, 60000);
  });
};

/**
 * Transform Python response to frontend expected format
 */
const transformResponse = (pythonResult) => {
  return {
    boq_text: pythonResult.matched_work || pythonResult.input_work,
    projectMaterial: pythonResult.input_work,
    industry: pythonResult.industry,
    matched_work: pythonResult.matched_work,
    match_type: pythonResult.match_type,
    confidence: pythonResult.confidence,
    state: pythonResult.state,
    tier: pythonResult.tier,
    state_factor: pythonResult.state_factor,
    total_hours: pythonResult.total_hours,
    wbs: pythonResult.wbs,
    subcategory: pythonResult.industry
  };
};

/**
 * POST /api/wbs/generate
 * Generate WBS for a single project
 */
exports.generateWBS = async (req, res) => {
  try {
    const { work, length, breadth, state, tier } = req.body;
    
    if (!work) {
      return res.status(400).json({
        success: false,
        error: 'Work/project description is required'
      });
    }
    
    const scriptArgs = {
      mode: 'single',
      work,
      length: length || null,
      breadth: breadth || null,
      state: state || null,
      tier: tier || null
    };
    
    const result = await executePythonScript(scriptArgs);
    
    // Transform the response to match frontend expectations
    const transformedResult = transformResponse(result);
    
    res.json({
      success: true,
      data: transformedResult
    });
    
  } catch (error) {
    console.error('WBS Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate WBS'
    });
  }
};

/**
 * POST /api/wbs/batch
 * Generate WBS for multiple projects
 */
exports.generateBatchWBS = async (req, res) => {
  try {
    const { projects } = req.body;
    
    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Projects array is required and must not be empty'
      });
    }
    
    for (let i = 0; i < projects.length; i++) {
      if (!projects[i].work) {
        return res.status(400).json({
          success: false,
          error: `Project at index ${i} is missing 'work' field`
        });
      }
    }
    
    const scriptArgs = {
      mode: 'batch',
      projects: projects.map(p => ({
        work: p.work,
        length: p.length || null,
        breadth: p.breadth || null,
        state: p.state || null,
        tier: p.tier || null
      }))
    };
    
    const result = await executePythonScript(scriptArgs);
    
    // Transform batch results
    const transformedResults = result.batch_results.map(item => {
      if (item.success && item.data) {
        return {
          success: true,
          data: transformResponse(item.data)
        };
      }
      return item;
    });
    
    res.json({
      success: true,
      results: transformedResults,
      total: result.total,
      successful: result.successful
    });
    
  } catch (error) {
    console.error('Batch WBS Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate batch WBS'
    });
  }
};

/**
 * GET /api/wbs/health
 * Check if Python script is accessible
 */
exports.healthCheck = async (req, res) => {
  try {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const testProcess = spawn(pythonPath, ['--version']);
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          message: 'WBS service is healthy',
          pythonPath
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Python is not properly configured'
        });
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};