const express = require("express");
const router = express.Router();
const {
  upload,
  processTextToBOQ,
  processFileToBOQ,
  getBOQStats,
  healthCheck,
} = require("../controllers/boqController");

/**
 * @route   POST /api/boq/text
 * @desc    Generate BOQ from text input
 * @access  Public (add authentication middleware as needed)
 * @body    { text: string, minConfidence?: number }
 */
router.post("/text", processTextToBOQ);

/**
 * @route   POST /api/boq/file
 * @desc    Generate BOQ from file upload (PDF, DOCX, Image)
 * @access  Public (add authentication middleware as needed)
 * @body    FormData with 'file' field and optional 'minConfidence'
 */
router.post("/file", upload.single("file"), processFileToBOQ);

/**
 * @route   GET /api/boq/stats
 * @desc    Get BOQ generation statistics
 * @access  Public (add authentication middleware as needed)
 */
router.get("/stats", getBOQStats);

/**
 * @route   GET /api/boq/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get("/health", healthCheck);

module.exports = router;
