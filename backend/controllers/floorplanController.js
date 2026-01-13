const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");

// Configure multer for floor plan image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../python/data/floorplans");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "floorplan-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/tiff",
    "image/bmp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PNG, JPG, JPEG, TIFF, and BMP images are allowed."
      )
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for floor plans
  },
});

/**
 * Execute Python script and return parsed output
 */
const executePythonScript = (scriptPath, args) => {
  return new Promise((resolve, reject) => {
    // Try to use PYTHON_PATH from environment, fallback to python3 (common on macOS/Linux)
    // or python (Windows/common alias)
    const PYTHON_EXECUTABLE = process.env.PYTHON_PATH || "python3";
    const python = spawn(PYTHON_EXECUTABLE, [scriptPath, ...args], {
      env: {
        ...process.env,
      },
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      }
    });

    python.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};

/**
 * Process floor plan image to detect rooms and generate BOQ
 */
const processFloorplan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No floor plan image uploaded",
      });
    }

    const { meterPerPixel, autoSelectWorks, selectedWorks } = req.body;

    // Validate meter per pixel
    const scale = parseFloat(meterPerPixel);
    if (isNaN(scale) || scale <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid meterPerPixel value. Must be a positive number.",
      });
    }

    const filePath = req.file.path;
    const scriptPath = path.join(__dirname, "../python/floorplan_api.py");

    // Prepare arguments
    // Default to 'true' if autoSelectWorks is not provided (auto-generate BOQ)
    const shouldAutoSelect =
      autoSelectWorks !== undefined
        ? autoSelectWorks === "true" || autoSelectWorks === true
        : true;

    const args = [
      filePath,
      scale.toString(),
      shouldAutoSelect ? "true" : "false",
    ];

    // Add selected works if provided
    if (selectedWorks && typeof selectedWorks === "string") {
      try {
        JSON.parse(selectedWorks); // Validate JSON
        args.push(selectedWorks);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Invalid selectedWorks JSON format",
        });
      }
    }

    const result = await executePythonScript(scriptPath, args);

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error("Error deleting uploaded file:", unlinkError);
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Floor plan processed successfully",
        data: result.data,
        filename: req.file.originalname,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Failed to process floor plan",
      });
    }
  } catch (error) {
    console.error("Error processing floor plan:", error);

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Error deleting uploaded file:", unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Analyze floor plan without generating full BOQ
 * Returns detected rooms and available works
 */
const analyzeFloorplan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No floor plan image uploaded",
      });
    }

    const { meterPerPixel } = req.body;

    const scale = parseFloat(meterPerPixel);
    if (isNaN(scale) || scale <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid meterPerPixel value. Must be a positive number.",
      });
    }

    const filePath = req.file.path;
    const scriptPath = path.join(__dirname, "../python/floorplan_api.py");

    // Run with auto_select_works = false to get just room detection
    const args = [filePath, scale.toString(), "false"];

    const result = await executePythonScript(scriptPath, args);

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error("Error deleting uploaded file:", unlinkError);
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Floor plan analyzed successfully",
        data: {
          rooms: result.data.rooms,
          available_works: result.data.available_works,
          total_rooms: result.data.total_rooms,
          room_summary: result.data.room_summary,
        },
        filename: req.file.originalname,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Failed to analyze floor plan",
      });
    }
  } catch (error) {
    console.error("Error analyzing floor plan:", error);

    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Error deleting uploaded file:", unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Generate BOQ from previously analyzed rooms with user-selected works
 */
const generateBOQFromSelection = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No floor plan image uploaded",
      });
    }

    const { meterPerPixel, selectedWorks } = req.body;

    const scale = parseFloat(meterPerPixel);
    if (isNaN(scale) || scale <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid meterPerPixel value",
      });
    }

    if (!selectedWorks) {
      return res.status(400).json({
        success: false,
        error: "selectedWorks is required",
      });
    }

    const filePath = req.file.path;
    const scriptPath = path.join(__dirname, "../python/floorplan_api.py");

    const args = [filePath, scale.toString(), "false", selectedWorks];

    const result = await executePythonScript(scriptPath, args);

    // Clean up
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error("Error deleting uploaded file:", unlinkError);
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "BOQ generated from selection",
        data: result.data,
        filename: req.file.originalname,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Failed to generate BOQ",
      });
    }
  } catch (error) {
    console.error("Error generating BOQ from selection:", error);

    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Error deleting uploaded file:", unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

/**
 * Get scope master data
 */
const getScopeMaster = async (req, res) => {
  try {
    const scopeMasterPath = path.join(
      __dirname,
      "../python/data/scope_master.xlsx"
    );

    // Check if file exists
    await fs.access(scopeMasterPath);

    // For now, return a message. You could parse Excel and return data
    return res.status(200).json({
      success: true,
      message: "Scope master file exists",
      path: scopeMasterPath,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      error: "Scope master file not found",
    });
  }
};

/**
 * Health check endpoint
 */
const healthCheck = async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, "../python/floorplan_api.py");
    const scopeMasterPath = path.join(
      __dirname,
      "../python/data/scope_master.xlsx"
    );

    // Check if files exist
    await fs.access(scriptPath);
    await fs.access(scopeMasterPath);

    return res.status(200).json({
      success: true,
      message: "Floor plan service is healthy",
      pythonScriptPath: scriptPath,
      scopeMasterPath: scopeMasterPath,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Required files not found or not accessible",
    });
  }
};

module.exports = {
  upload,
  processFloorplan,
  analyzeFloorplan,
  generateBOQFromSelection,
  getScopeMaster,
  healthCheck,
};
