const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Python configuration
  pythonExecutable: "py",
  pythonScriptPath: path.join(__dirname, '../python/bom.py'),
  dataFilePath: path.join(__dirname, '../python/data/mat_quan.xlsx'),
  
  // File upload configuration
  uploadDir: path.join(__dirname, '../uploads'),
  downloadDir: path.join(__dirname, '../downloads'),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  
  // Allowed file types
  allowedFileTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
};