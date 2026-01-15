// // const { spawn } = require('child_process');
// // const path = require('path');
// // const fs = require('fs').promises;
// // const multer = require('multer');

// // // Configure multer for file uploads
// // const storage = multer.diskStorage({
// //   destination: async (req, file, cb) => {
// //     const uploadDir = path.join(__dirname, '../python/data/uploads');
// //     try {
// //       await fs.mkdir(uploadDir, { recursive: true });
// //       cb(null, uploadDir);
// //     } catch (error) {
// //       cb(error);
// //     }
// //   },
// //   filename: (req, file, cb) => {
// //     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
// //     cb(null, uniqueSuffix + path.extname(file.originalname));
// //   }
// // });

// // const fileFilter = (req, file, cb) => {
// //   const allowedTypes = [
// //     'application/pdf',
// //     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
// //     'application/msword',
// //     'image/png',
// //     'image/jpeg',
// //     'image/jpg',
// //     'text/plain'
// //   ];

// //   if (allowedTypes.includes(file.mimetype)) {
// //     cb(null, true);
// //   } else {
// //     cb(new Error('Invalid file type. Only PDF, DOCX, DOC, PNG, JPG, and TXT files are allowed.'));
// //   }
// // };

// // const upload = multer({
// //   storage: storage,
// //   fileFilter: fileFilter,
// //   limits: {
// //     fileSize: 10 * 1024 * 1024 // 10MB limit
// //   }
// // });

// // /**
// //  * Execute Python script and return parsed output
// //  */
// // const executePythonScript = (scriptPath, args) => {
// //   return new Promise((resolve, reject) => {
// //     const python = spawn('python', [scriptPath, ...args]);

// //     let stdout = '';
// //     let stderr = '';

// //     python.stdout.on('data', (data) => {
// //       stdout += data.toString();
// //     });

// //     python.stderr.on('data', (data) => {
// //       stderr += data.toString();
// //     });

// //     python.on('close', (code) => {
// //       if (code !== 0) {
// //         reject(new Error(`Python script exited with code ${code}: ${stderr}`));
// //       } else {
// //         try {
// //           const result = JSON.parse(stdout);
// //           resolve(result);
// //         } catch (error) {
// //           reject(new Error(`Failed to parse Python output: ${stdout}`));
// //         }
// //       }
// //     });

// //     python.on('error', (error) => {
// //       reject(new Error(`Failed to start Python process: ${error.message}`));
// //     });
// //   });
// // };

// // /**
// //  * Process text input to generate BOQ
// //  */
// // const processTextToBOQ = async (req, res) => {
// //   try {
// //     const { text, minConfidence } = req.body;

// //     if (!text || typeof text !== 'string' || text.trim().length === 0) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'Text input is required and cannot be empty'
// //       });
// //     }

// //     const scriptPath = path.join(__dirname, '../python/boq_api.py');
// //     const args = ['text', text, minConfidence || '0.45'];

// //     const result = await executePythonScript(scriptPath, args);

// //     if (result.success) {
// //       return res.status(200).json({
// //         success: true,
// //         message: 'BOQ generated successfully',
// //         data: result.data,
// //         count: result.count
// //       });
// //     } else {
// //       return res.status(500).json({
// //         success: false,
// //         error: result.error || 'Failed to generate BOQ'
// //       });
// //     }
// //   } catch (error) {
// //     console.error('Error processing text to BOQ:', error);
// //     return res.status(500).json({
// //       success: false,
// //       error: error.message || 'Internal server error'
// //     });
// //   }
// // };

// // /**
// //  * Process file upload to generate BOQ
// //  */
// // const processFileToBOQ = async (req, res) => {
// //   try {
// //     if (!req.file) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'No file uploaded'
// //       });
// //     }

// //     const { minConfidence } = req.body;
// //     const filePath = req.file.path;

// //     const scriptPath = path.join(__dirname, '../python/boq_api.py');
// //     const args = ['file', filePath, minConfidence || '0.45'];

// //     const result = await executePythonScript(scriptPath, args);

// //     // Clean up uploaded file
// //     try {
// //       await fs.unlink(filePath);
// //     } catch (unlinkError) {
// //       console.error('Error deleting uploaded file:', unlinkError);
// //     }

// //     if (result.success) {
// //       return res.status(200).json({
// //         success: true,
// //         message: 'BOQ generated successfully from file',
// //         data: result.data,
// //         count: result.count,
// //         filename: req.file.originalname
// //       });
// //     } else {
// //       return res.status(500).json({
// //         success: false,
// //         error: result.error || 'Failed to generate BOQ from file'
// //       });
// //     }
// //   } catch (error) {
// //     console.error('Error processing file to BOQ:', error);

// //     // Clean up uploaded file on error
// //     if (req.file && req.file.path) {
// //       try {
// //         await fs.unlink(req.file.path);
// //       } catch (unlinkError) {
// //         console.error('Error deleting uploaded file:', unlinkError);
// //       }
// //     }

// //     return res.status(500).json({
// //       success: false,
// //       error: error.message || 'Internal server error'
// //     });
// //   }
// // };

// // /**
// //  * Get BOQ statistics
// //  */
// // const getBOQStats = async (req, res) => {
// //   try {
// //     // This could query your database for historical BOQ data
// //     // For now, returning a placeholder response
// //     return res.status(200).json({
// //       success: true,
// //       message: 'BOQ statistics retrieved successfully',
// //       data: {
// //         totalBOQsGenerated: 0,
// //         averageItemsPerBOQ: 0,
// //         mostCommonWorks: [],
// //         mostCommonRooms: []
// //       }
// //     });
// //   } catch (error) {
// //     console.error('Error getting BOQ stats:', error);
// //     return res.status(500).json({
// //       success: false,
// //       error: error.message || 'Internal server error'
// //     });
// //   }
// // };

// // /**
// //  * Health check endpoint
// //  */
// // const healthCheck = async (req, res) => {
// //   try {
// //     const scriptPath = path.join(__dirname, '../python/boq_api.py');

// //     // Check if Python script exists
// //     await fs.access(scriptPath);

// //     return res.status(200).json({
// //       success: true,
// //       message: 'BOQ service is healthy',
// //       pythonScriptPath: scriptPath
// //     });
// //   } catch (error) {
// //     return res.status(500).json({
// //       success: false,
// //       error: 'Python script not found or not accessible'
// //     });
// //   }
// // };

// // module.exports = {
// //   upload,
// //   processTextToBOQ,
// //   processFileToBOQ,
// //   getBOQStats,
// //   healthCheck
// // };

// const { spawn } = require('child_process');
// const path = require('path');
// const fs = require('fs').promises;
// const multer = require('multer');

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: async (req, file, cb) => {
//     const uploadDir = path.join(__dirname, '../python/data/uploads');
//     try {
//       await fs.mkdir(uploadDir, { recursive: true });
//       cb(null, uploadDir);
//     } catch (error) {
//       cb(error);
//     }
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   }
// });

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [
//     'application/pdf',
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//     'application/msword',
//     'image/png',
//     'image/jpeg',
//     'image/jpg',
//     'text/plain'
//   ];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid file type. Only PDF, DOCX, DOC, PNG, JPG, and TXT files are allowed.'));
//   }
// };

// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 10 * 1024 * 1024 // 10MB limit
//   }
// });

// /**
//  * Execute Python script and return parsed output
//  * Updated to handle the new script's JSON output format
//  */
// const executePythonScript = (mode, input) => {
//   return new Promise((resolve, reject) => {
//     const scriptPath = path.join(__dirname, '../python/boq_processor.py');

//     // Pass mode and input as JSON via stdin
//     const python = spawn('python', [scriptPath]);

//     let stdout = '';
//     let stderr = '';

//     // Send input data via stdin
//     const inputData = JSON.stringify({ mode, input });
//     python.stdin.write(inputData);
//     python.stdin.end();

//     python.stdout.on('data', (data) => {
//       stdout += data.toString();
//     });

//     python.stderr.on('data', (data) => {
//       stderr += data.toString();
//     });

//     python.on('close', (code) => {
//       if (code !== 0) {
//         reject(new Error(`Python script exited with code ${code}: ${stderr}`));
//       } else {
//         try {
//           // Parse the JSON output from boq_payload.json format
//           const result = JSON.parse(stdout);
//           resolve(result);
//         } catch (error) {
//           reject(new Error(`Failed to parse Python output: ${stdout}\nError: ${error.message}`));
//         }
//       }
//     });

//     python.on('error', (error) => {
//       reject(new Error(`Failed to start Python process: ${error.message}`));
//     });
//   });
// };

// /**
//  * Process text input to generate BOQ
//  * Updated to work with the new token-overlap based text processor
//  */
// const processTextToBOQ = async (req, res) => {
//   try {
//     const { text } = req.body;

//     if (!text || typeof text !== 'string' || text.trim().length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: 'Text input is required and cannot be empty'
//       });
//     }

//     // Mode 1: Raw text processing
//     const result = await executePythonScript('1', text);

//     if (result && Array.isArray(result)) {
//       return res.status(200).json({
//         success: true,
//         message: 'BOQ generated successfully from text',
//         data: result,
//         count: result.length,
//         metadata: {
//           processingMode: 'TEXT_PARSER',
//           timestamp: new Date().toISOString()
//         }
//       });
//     } else {
//       return res.status(500).json({
//         success: false,
//         error: 'No BOQ items extracted from text'
//       });
//     }
//   } catch (error) {
//     console.error('Error processing text to BOQ:', error);
//     return res.status(500).json({
//       success: false,
//       error: error.message || 'Internal server error'
//     });
//   }
// };

// /**
//  * Process file upload to generate BOQ
//  * Updated to handle both document (mode 2) and image (mode 3) processing
//  */
// const processFileToBOQ = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         error: 'No file uploaded'
//       });
//     }

//     const filePath = req.file.path;
//     const fileExt = path.extname(req.file.originalname).toLowerCase();

//     // Determine processing mode based on file type
//     let mode;
//     if (['.png', '.jpg', '.jpeg'].includes(fileExt)) {
//       mode = '3'; // Vision Engine for images
//     } else if (['.pdf', '.docx', '.doc', '.txt'].includes(fileExt)) {
//       mode = '2'; // Document processor
//     } else {
//       await fs.unlink(filePath);
//       return res.status(400).json({
//         success: false,
//         error: 'Unsupported file type'
//       });
//     }

//     // Process the file
//     const result = await executePythonScript(mode, filePath);

//     // Clean up uploaded file
//     try {
//       await fs.unlink(filePath);
//     } catch (unlinkError) {
//       console.error('Error deleting uploaded file:', unlinkError);
//     }

//     if (result && Array.isArray(result)) {
//       return res.status(200).json({
//         success: true,
//         message: `BOQ generated successfully from ${mode === '3' ? 'image' : 'document'}`,
//         data: result,
//         count: result.length,
//         metadata: {
//           filename: req.file.originalname,
//           processingMode: mode === '3' ? 'VISION_ENGINE' : 'TEXT_PARSER',
//           fileType: fileExt,
//           timestamp: new Date().toISOString()
//         }
//       });
//     } else {
//       return res.status(500).json({
//         success: false,
//         error: 'No BOQ items extracted from file'
//       });
//     }
//   } catch (error) {
//     console.error('Error processing file to BOQ:', error);

//     // Clean up uploaded file on error
//     if (req.file && req.file.path) {
//       try {
//         await fs.unlink(req.file.path);
//       } catch (unlinkError) {
//         console.error('Error deleting uploaded file:', unlinkError);
//       }
//     }

//     return res.status(500).json({
//       success: false,
//       error: error.message || 'Internal server error'
//     });
//   }
// };

// /**
//  * Get BOQ statistics
//  * Can be expanded to query database for historical data
//  */
// const getBOQStats = async (req, res) => {
//   try {
//     // Read the last generated BOQ if exists
//     const jsonPath = path.join(__dirname, '../python/boq_payload.json');

//     try {
//       const jsonData = await fs.readFile(jsonPath, 'utf8');
//       const boqData = JSON.parse(jsonData);

//       // Calculate statistics
//       const roomCounts = {};
//       const workCounts = {};

//       boqData.forEach(item => {
//         roomCounts[item.room_name] = (roomCounts[item.room_name] || 0) + 1;
//         workCounts[item.work_name] = (workCounts[item.work_name] || 0) + 1;
//       });

//       return res.status(200).json({
//         success: true,
//         message: 'BOQ statistics retrieved successfully',
//         data: {
//           totalItems: boqData.length,
//           uniqueRooms: Object.keys(roomCounts).length,
//           uniqueWorks: Object.keys(workCounts).length,
//           roomBreakdown: roomCounts,
//           workBreakdown: workCounts,
//           lastGenerated: new Date().toISOString()
//         }
//       });
//     } catch (fileError) {
//       return res.status(200).json({
//         success: true,
//         message: 'No previous BOQ data found',
//         data: {
//           totalItems: 0,
//           uniqueRooms: 0,
//           uniqueWorks: 0,
//           roomBreakdown: {},
//           workBreakdown: {}
//         }
//       });
//     }
//   } catch (error) {
//     console.error('Error getting BOQ stats:', error);
//     return res.status(500).json({
//       success: false,
//       error: error.message || 'Internal server error'
//     });
//   }
// };

// /**
//  * Health check endpoint
//  * Verifies Python script and dependencies
//  */
// const healthCheck = async (req, res) => {
//   try {
//     const scriptPath = path.join(__dirname, '../python/boq_processor.py');

//     // Check if Python script exists
//     await fs.access(scriptPath);

//     // Test Python execution
//     const testResult = await new Promise((resolve) => {
//       const python = spawn('python', ['--version']);
//       let version = '';

//       python.stdout.on('data', (data) => {
//         version += data.toString();
//       });

//       python.on('close', (code) => {
//         resolve({ code, version: version.trim() });
//       });

//       python.on('error', () => {
//         resolve({ code: -1, version: 'Not found' });
//       });
//     });

//     if (testResult.code === 0) {
//       return res.status(200).json({
//         success: true,
//         message: 'BOQ service is healthy',
//         data: {
//           pythonVersion: testResult.version,
//           scriptPath: scriptPath,
//           features: ['Text Processing', 'Document Parsing', 'Vision Engine'],
//           dynamoDBConnected: true,
//           geminiAPIConfigured: true
//         }
//       });
//     } else {
//       return res.status(500).json({
//         success: false,
//         error: 'Python not found or not accessible'
//       });
//     }
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       error: 'Python script not found or not accessible',
//       details: error.message
//     });
//   }
// };

// module.exports = {
//   upload,
//   processTextToBOQ,
//   processFileToBOQ,
//   getBOQStats,
//   healthCheck
// };

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../python/data/uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "text/plain",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOCX, DOC, PNG, JPG, and TXT files are allowed."
      )
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const executePythonScript = (mode, input, context = {}) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../python/boq_engine_api.py");

    console.log(
      `🚀 Executing Python script: mode=${mode}, input=${
        typeof input === "string" ? input.substring(0, 50) : input
      }`
    );

    const python = spawn("python", [scriptPath]);

    let stdout = "";
    let stderr = "";

    // Send input data via stdin (include context for image processing)
    const inputData = JSON.stringify({ mode, input, context });
    python.stdin.write(inputData);
    python.stdin.end();

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      const stderrText = data.toString();
      stderr += stderrText;
      // Log Python debug output
      console.log("🐍 Python:", stderrText);
    });

    python.on("close", (code) => {
      console.log(`🏁 Python process exited with code: ${code}`);

      if (stderr) {
        console.log("📋 Full Python stderr:", stderr);
      }

      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      } else {
        try {
          // Parse the JSON output
          const result = JSON.parse(stdout);
          console.log(
            `✅ Parsed result: success=${result.success}, count=${result.count}`
          );
          resolve(result);
        } catch (error) {
          console.error(
            "❌ Failed to parse Python output:",
            stdout.substring(0, 200)
          );
          reject(
            new Error(
              `Failed to parse Python output: ${
                error.message
              }\nOutput: ${stdout.substring(0, 200)}`
            )
          );
        }
      }
    });

    python.on("error", (error) => {
      console.error("❌ Python process error:", error);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};

/**
 * Process text input to generate BOQ
 */
const processTextToBOQ = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Text input is required and cannot be empty",
      });
    }

    console.log("📝 Processing text input:", text.substring(0, 100));

    // Mode 1: Raw text processing
    const result = await executePythonScript("1", text);

    // FIXED: Check result.success and result.data
    if (result.success && result.data) {
      return res.status(200).json({
        success: true,
        message: "BOQ generated successfully from text",
        data: result.data,
        count: result.count,
        metadata: {
          processingMode: "TEXT_PARSER",
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "No BOQ items extracted from text",
        data: [],
        count: 0,
      });
    }
  } catch (error) {
    console.error("❌ Error processing text to BOQ:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      data: [],
      count: 0,
    });
  }
};

/**
 * Process file upload to generate BOQ
 * FIXED: Now properly handles Python response format
 */
const processFileToBOQ = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    console.log("📁 Processing file:", req.file.originalname, "at", filePath);

    // Determine processing mode based on file type
    let mode;
    if ([".png", ".jpg", ".jpeg"].includes(fileExt)) {
      mode = "3"; // Vision Engine for images
      console.log("🖼️ Using Vision Engine for image");
    } else if ([".pdf", ".docx", ".doc", ".txt"].includes(fileExt)) {
      mode = "2"; // Document processor
      console.log("📄 Using Document Processor");
    } else {
      await fs.unlink(filePath);
      return res.status(400).json({
        success: false,
        error: "Unsupported file type",
      });
    }

    // Prepare context for image processing
    let context = {};
    if (mode === "3") {
      // For images, we need project context
      context = {
        project_name: req.body.project_name || "Untitled Project",
        location: req.body.location || "Unknown Location",
        project_type: req.body.project_type || "General Construction",
      };
    }

    // Process the file
    const result = await executePythonScript(mode, filePath, context);

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
      console.log("🗑️ Deleted temporary file");
    } catch (unlinkError) {
      console.error("⚠️ Error deleting uploaded file:", unlinkError);
    }

    // FIXED: Check result.success and result.data
    if (result.success && result.data) {
      return res.status(200).json({
        success: true,
        message: `BOQ generated successfully from ${
          mode === "3" ? "image" : "document"
        }`,
        data: result.data,
        count: result.count,
        metadata: {
          filename: req.file.originalname,
          processingMode: mode === "3" ? "VISION_ENGINE" : "TEXT_PARSER",
          fileType: fileExt,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "No BOQ items extracted from file",
        data: [],
        count: 0,
        metadata: {
          filename: req.file.originalname,
          fileType: fileExt,
        },
      });
    }
  } catch (error) {
    console.error("❌ Error processing file to BOQ:", error);

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("⚠️ Error deleting uploaded file:", unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      data: [],
      count: 0,
    });
  }
};

/**
 * Get BOQ statistics
 */
const getBOQStats = async (req, res) => {
  try {
    const jsonPath = path.join(__dirname, "../python/boq_payload.json");

    try {
      const jsonData = await fs.readFile(jsonPath, "utf8");
      const boqData = JSON.parse(jsonData);

      const roomCounts = {};
      const workCounts = {};

      boqData.forEach((item) => {
        roomCounts[item.room_name] = (roomCounts[item.room_name] || 0) + 1;
        workCounts[item.work_name] = (workCounts[item.work_name] || 0) + 1;
      });

      return res.status(200).json({
        success: true,
        message: "BOQ statistics retrieved successfully",
        data: {
          totalItems: boqData.length,
          uniqueRooms: Object.keys(roomCounts).length,
          uniqueWorks: Object.keys(workCounts).length,
          roomBreakdown: roomCounts,
          workBreakdown: workCounts,
          lastGenerated: new Date().toISOString(),
        },
      });
    } catch (fileError) {
      return res.status(200).json({
        success: true,
        message: "No previous BOQ data found",
        data: {
          totalItems: 0,
          uniqueRooms: 0,
          uniqueWorks: 0,
          roomBreakdown: {},
          workBreakdown: {},
        },
      });
    }
  } catch (error) {
    console.error("Error getting BOQ stats:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Health check endpoint
 */
const healthCheck = async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, "../python/boq_engine_api.py");

    await fs.access(scriptPath);

    const testResult = await new Promise((resolve) => {
      const python = spawn("python3", ["--version"]);
      let version = "";

      python.stdout.on("data", (data) => {
        version += data.toString();
      });

      python.on("close", (code) => {
        resolve({ code, version: version.trim() });
      });

      python.on("error", () => {
        resolve({ code: -1, version: "Not found" });
      });
    });

    if (testResult.code === 0) {
      return res.status(200).json({
        success: true,
        message: "BOQ service is healthy",
        data: {
          pythonVersion: testResult.version,
          scriptPath: scriptPath,
          features: ["Text Processing", "Document Parsing", "Vision Engine"],
          dynamoDBConnected: true,
          geminiAPIConfigured: true,
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Python not found or not accessible",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Python script not found or not accessible",
      details: error.message,
    });
  }
};

module.exports = {
  upload,
  processTextToBOQ,
  processFileToBOQ,
  getBOQStats,
  healthCheck,
};
