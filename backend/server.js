const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const bomRoutes = require('./routes/bomRoutes');
const config = require('./config/config');

const app = express();

// Middleware
app.use(helmet());
// const cors = require("cors");

// app.use(cors({
//   origin: ["https://logicleap-2.onrender.com","http://localhost:3000", "http://localhost:5173", "http://localhost:5174","https://logicleap-1.onrender.com/api"],
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true
// }));




app.use(
  cors({
    origin: [
      "https://logicleap-2.onrender.com",
      "https://logicleap-1.onrender.com",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);
;





app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for serving generated Excel files)
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'BOM Prediction API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/bom', bomRoutes);
app.use("/api/estimation", require("./routes/estimationRoutes"));
app.use("/api/wbs", require("./routes/wbsRoutes"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 BOM Prediction Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🐍 Python script location: ${config.pythonScriptPath}`);
});

module.exports = app;