const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const layoutRoutes = require('./routes/layouts');
const pitchbookRoutes = require('./routes/pitchbooks');
const thumbnailRoutes = require('./routes/thumbnails');
const generateRoutes = require('./routes/generate');
const templatePromptsRoutes = require('./routes/templatePrompts');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure data directory exists
fs.ensureDirSync(path.join(__dirname, 'data'));

// API Routes
app.use('/api/layouts', layoutRoutes);
app.use('/api/pitchbooks', pitchbookRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/template-prompts', templatePromptsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});