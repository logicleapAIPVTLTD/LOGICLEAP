const express = require("express");
const router = express.Router();
const {
  upload,
  processFloorplan,
  analyzeFloorplan,
  generateBOQFromSelection,
  getScopeMaster,
  healthCheck,
} = require("../controllers/floorplanController");

/**
 * @route   POST /api/floorplan/process
 * @desc    Process floor plan image and generate complete BOQ
 * @access  Public (add authentication as needed)
 * @body    FormData:
 *          - file: Floor plan image (PNG, JPG, TIFF, BMP)
 *          - meterPerPixel: Scale factor (number)
 *          - autoSelectWorks: true/false (optional, default: true)
 *          - selectedWorks: JSON string (optional)
 *
 * @example
 * const formData = new FormData();
 * formData.append('file', floorplanFile);
 * formData.append('meterPerPixel', '0.01');
 * formData.append('autoSelectWorks', 'true');
 */
router.post("/process", upload.single("file"), processFloorplan);

/**
 * @route   POST /api/floorplan/analyze
 * @desc    Analyze floor plan to detect rooms and get available works
 *          (Does NOT generate full BOQ - use this for user selection)
 * @access  Public
 * @body    FormData:
 *          - file: Floor plan image
 *          - meterPerPixel: Scale factor (number)
 *
 * @example
 * const formData = new FormData();
 * formData.append('file', floorplanFile);
 * formData.append('meterPerPixel', '0.01');
 */
router.post("/analyze", upload.single("file"), analyzeFloorplan);

/**
 * @route   POST /api/floorplan/generate-boq
 * @desc    Generate BOQ based on user-selected works
 * @access  Public
 * @body    FormData:
 *          - file: Floor plan image
 *          - meterPerPixel: Scale factor (number)
 *          - selectedWorks: JSON string mapping room types to work indices
 *
 * @example
 * const selectedWorks = {
 *   "bedroom": [0, 1, 3],  // Select works at indices 0, 1, 3
 *   "kitchen": [0, 2],
 *   "bathroom": [1, 2, 4]
 * };
 * formData.append('selectedWorks', JSON.stringify(selectedWorks));
 */
router.post("/generate-boq", upload.single("file"), generateBOQFromSelection);

/**
 * @route   GET /api/floorplan/scope-master
 * @desc    Get scope master information
 * @access  Public
 */
router.get("/scope-master", getScopeMaster);

/**
 * @route   GET /api/floorplan/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get("/health", healthCheck);

module.exports = router;
