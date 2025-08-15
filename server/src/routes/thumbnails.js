const express = require('express');
const router = express.Router();
const openXmlParser = require('../parsers/openXmlParser');
const thumbnailGenerator = require('../services/thumbnailGenerator');

// GET /api/thumbnails/:layout - Get thumbnail for specific layout
router.get('/:layout', async (req, res) => {
  try {
    const { layout: layoutName } = req.params;
    const layout = await openXmlParser.getLayoutByName(layoutName);
    
    if (!layout) {
      return res.status(404).json({
        success: false,
        error: 'Layout not found'
      });
    }
    
    const format = req.query.format || 'svg';
    
    if (format === 'base64') {
      const thumbnail = thumbnailGenerator.generateBase64Thumbnail(layout);
      res.json({
        success: true,
        thumbnail,
        layout: layout.name
      });
    } else if (format === 'html') {
      const preview = thumbnailGenerator.generateHTMLPreview(layout);
      res.send(preview);
    } else {
      // Default to SVG
      const svg = thumbnailGenerator.generateSVGThumbnail(layout);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    }
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate thumbnail',
      message: error.message
    });
  }
});

// GET /api/thumbnails - Get all thumbnails
router.get('/', async (req, res) => {
  try {
    const layouts = await openXmlParser.getAllLayouts();
    const format = req.query.format || 'base64';
    
    const thumbnails = layouts.map(layout => ({
      name: layout.name,
      fileName: layout.fileName,
      thumbnail: format === 'base64' 
        ? thumbnailGenerator.generateBase64Thumbnail(layout)
        : thumbnailGenerator.generateSVGThumbnail(layout)
    }));
    
    res.json({
      success: true,
      thumbnails
    });
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate thumbnails',
      message: error.message
    });
  }
});

module.exports = router;