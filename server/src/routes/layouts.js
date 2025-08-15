const express = require('express');
const router = express.Router();
const openXmlParser = require('../parsers/openXmlParser');
const thumbnailGenerator = require('../services/thumbnailGenerator');

// GET /api/layouts - Get all available slide layouts
router.get('/', async (req, res) => {
  try {
    const layouts = await openXmlParser.getAllLayouts();
    
    // Add thumbnail data to each layout
    const layoutsWithThumbnails = layouts.map(layout => ({
      ...layout,
      thumbnail: thumbnailGenerator.generateBase64Thumbnail(layout)
    }));
    
    res.json({
      success: true,
      layouts: layoutsWithThumbnails
    });
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch layouts',
      message: error.message
    });
  }
});

// GET /api/layouts/:name - Get specific layout details
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const layout = await openXmlParser.getLayoutByName(name);
    
    if (!layout) {
      return res.status(404).json({
        success: false,
        error: 'Layout not found'
      });
    }
    
    // Add thumbnail and preview
    const layoutWithDetails = {
      ...layout,
      thumbnail: thumbnailGenerator.generateBase64Thumbnail(layout),
      preview: thumbnailGenerator.generateHTMLPreview(layout)
    };
    
    res.json({
      success: true,
      layout: layoutWithDetails
    });
  } catch (error) {
    console.error('Error fetching layout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch layout',
      message: error.message
    });
  }
});

module.exports = router;