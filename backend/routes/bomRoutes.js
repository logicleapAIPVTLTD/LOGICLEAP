const express = require('express');
const { body } = require('express-validator');
const bomController = require('../controllers/bomController');
const multer = require('multer');
const path = require('path');
const config = require('../config/config');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (config.allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files are allowed.'));
    }
  }
});

// Validation middleware
const predictValidation = [
  body('userWork').trim().notEmpty().withMessage('Work description is required'),
  body('length').isFloat({ min: 0.1 }).withMessage('Length must be a positive number'),
  body('breadth').isFloat({ min: 0.1 }).withMessage('Breadth must be a positive number'),
  body('projectDays').optional().isInt({ min: 1 }).withMessage('Project days must be a positive integer'),
  body('tankCapacity').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Tank capacity must be a non-negative number')
];

// Routes
router.post('/predict', predictValidation, bomController.predictBOM);
router.post('/predict-with-file', upload.single('dataFile'), predictValidation, bomController.predictBOMWithFile);
router.get('/work-types', bomController.getWorkTypes);
router.get('/domains', bomController.getDomains);
router.get('/health', bomController.healthCheck);

module.exports = router;