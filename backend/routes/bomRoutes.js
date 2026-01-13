// const express = require('express');
// const { body } = require('express-validator');
// const bomController = require('../controllers/bomController');
// const multer = require('multer');
// const path = require('path');
// const config = require('../config/config');

// const router = express.Router();

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, config.uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// const upload = multer({
//   storage: storage,
//   limits: { fileSize: config.maxFileSize },
//   fileFilter: (req, file, cb) => {
//     if (config.allowedFileTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Invalid file type. Only Excel files are allowed.'));
//     }
//   }
// });

// // Validation middleware
// const predictValidation = [
//   body('userWork').trim().notEmpty().withMessage('Work description is required'),
//   body('length').isFloat({ min: 0.1 }).withMessage('Length must be a positive number'),
//   body('breadth').isFloat({ min: 0.1 }).withMessage('Breadth must be a positive number'),
//   body('projectDays').optional().isInt({ min: 1 }).withMessage('Project days must be a positive integer'),
//   body('tankCapacity').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Tank capacity must be a non-negative number')
// ];

// // Routes
// router.post('/predict', predictValidation, bomController.predictBOM);
// router.post('/predict-with-file', upload.single('dataFile'), predictValidation, bomController.predictBOMWithFile);
// router.get('/work-types', bomController.getWorkTypes);
// router.get('/domains', bomController.getDomains);
// router.get('/health', bomController.healthCheck);

// module.exports = router;

const express = require("express");
const router = express.Router();
const {
  generateBOM,
  generateBOMFromSource,
  downloadBOM,
  getMasterStats,
  testWorkTypeMatch,
  healthCheck,
} = require("../controllers/bomController");

/**
 * @route   POST /api/bom/generate
 * @desc    Generate BOM from BOQ data array
 * @access  Public (add authentication middleware as needed)
 * @body    {
 *            boqData: [
 *              {
 *                work_name: string,
 *                work_code?: string,
 *                dimensions: {
 *                  area?: [{value: number, unit: string}],
 *                  length?: [{value: number, unit: string}],
 *                  volume?: [{value: number, unit: string}],
 *                  quantity?: [{value: number, unit: string}]
 *                }
 *              }
 *            ],
 *            projectDays?: number (default: 15)
 *          }
 * @example
 * {
 *   "boqData": [
 *     {
 *       "work_name": "False Ceiling Gypsum",
 *       "dimensions": {
 *         "area": [{"value": 180.0, "unit": "sqft"}],
 *         "length": [{"value": 15.0, "unit": "ft"}]
 *       },
 *       "confidence": 0.95
 *     }
 *   ],
 *   "projectDays": 20
 * }
 */
router.post("/generate", generateBOM);

/**
 * @route   POST /api/bom/generate-from-source
 * @desc    Generate both BOQ and BOM from raw text or file path
 * @access  Public (add authentication middleware as needed)
 * @body    {
 *            text?: string (raw BOQ text),
 *            filePath?: string (path to document/image),
 *            mode?: string ('1'=text, '2'=document, '3'=image),
 *            projectDays?: number (default: 15)
 *          }
 * @example
 * {
 *   "text": "Bedroom 1\nVitrified Flooring - 150 sqft\nPainting - 200 sqft",
 *   "projectDays": 15
 * }
 */
router.post("/generate-from-source", generateBOMFromSource);

/**
 * @route   GET /api/bom/download/:filename
 * @desc    Download generated BOM Excel file
 * @access  Public (add authentication middleware as needed)
 * @param   filename - Excel filename (e.g., Final_Project_BOM_1234567890.xlsx)
 * @example GET /api/bom/download/Final_Project_BOM_1704123456789.xlsx
 */
router.get("/download/:filename", downloadBOM);

/**
 * @route   GET /api/bom/master-stats
 * @desc    Get statistics about BOM master data from DynamoDB
 * @access  Public (add authentication middleware as needed)
 * @returns {
 *   totalWorkTypes: number,
 *   totalMaterials: number,
 *   workTypeBreakdown: object,
 *   unitDistribution: object
 * }
 */
router.get("/master-stats", getMasterStats);

/**
 * @route   POST /api/bom/test-match
 * @desc    Test work type matching algorithm with a sample work name
 * @access  Public (useful for debugging and testing)
 * @body    { workName: string }
 * @example
 * {
 *   "workName": "False Ceiling with Gypsum Board"
 * }
 * @returns {
 *   inputWorkName: string,
 *   matchedWorkType: string,
 *   confidenceScore: number,
 *   alternatives: array
 * }
 */
router.post("/test-match", testWorkTypeMatch);

/**
 * @route   GET /api/bom/health
 * @desc    Health check endpoint for BOM service
 * @access  Public
 * @returns {
 *   scriptPath: string,
 *   dynamoDBConnected: boolean,
 *   masterDataLoaded: boolean,
 *   totalWorkTypes: number,
 *   totalMaterials: number
 * }
 */
router.get("/health", healthCheck);

module.exports = router;
