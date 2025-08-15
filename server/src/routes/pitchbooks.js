const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');

const dataPath = path.join(__dirname, '../data');

// Ensure data directory exists
fs.ensureDirSync(dataPath);

// GET /api/pitchbooks - Get all pitchbooks
router.get('/', async (req, res) => {
  try {
    const pitchbooksFile = path.join(dataPath, 'pitchbooks.json');
    
    if (!await fs.exists(pitchbooksFile)) {
      await fs.writeJson(pitchbooksFile, []);
      return res.json({ success: true, pitchbooks: [] });
    }
    
    const pitchbooks = await fs.readJson(pitchbooksFile);
    res.json({ success: true, pitchbooks });
  } catch (error) {
    console.error('Error fetching pitchbooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pitchbooks',
      message: error.message
    });
  }
});

// POST /api/pitchbooks - Create new pitchbook
router.post('/', async (req, res) => {
  try {
    const { title, type, sections } = req.body;
    
    if (!title || !sections || !Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title and sections'
      });
    }
    
    const pitchbook = {
      id: uuidv4(),
      title,
      type: type || 'standard',
      sections,
      slides: generateSlideStructure(sections),
      prompts: {},
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    const pitchbooksFile = path.join(dataPath, 'pitchbooks.json');
    let pitchbooks = [];
    
    if (await fs.exists(pitchbooksFile)) {
      pitchbooks = await fs.readJson(pitchbooksFile);
    }
    
    pitchbooks.push(pitchbook);
    await fs.writeJson(pitchbooksFile, pitchbooks, { spaces: 2 });
    
    // Also save individual pitchbook file
    const individualFile = path.join(dataPath, `pitchbook_${pitchbook.id}.json`);
    await fs.writeJson(individualFile, pitchbook, { spaces: 2 });
    
    res.json({ success: true, pitchbook });
  } catch (error) {
    console.error('Error creating pitchbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create pitchbook',
      message: error.message
    });
  }
});

// GET /api/pitchbooks/:id - Get specific pitchbook
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pitchbookFile = path.join(dataPath, `pitchbook_${id}.json`);
    
    if (!await fs.exists(pitchbookFile)) {
      return res.status(404).json({
        success: false,
        error: 'Pitchbook not found'
      });
    }
    
    const pitchbook = await fs.readJson(pitchbookFile);
    res.json({ success: true, pitchbook });
  } catch (error) {
    console.error('Error fetching pitchbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pitchbook',
      message: error.message
    });
  }
});

// PUT /api/pitchbooks/:id - Update pitchbook (mainly for prompts)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const pitchbookFile = path.join(dataPath, `pitchbook_${id}.json`);
    
    if (!await fs.exists(pitchbookFile)) {
      return res.status(404).json({
        success: false,
        error: 'Pitchbook not found'
      });
    }
    
    let pitchbook = await fs.readJson(pitchbookFile);
    
    // Update pitchbook with new data
    pitchbook = {
      ...pitchbook,
      ...updates,
      updated: new Date().toISOString()
    };
    
    // Save individual file
    await fs.writeJson(pitchbookFile, pitchbook, { spaces: 2 });
    
    // Update main pitchbooks file
    const pitchbooksFile = path.join(dataPath, 'pitchbooks.json');
    if (await fs.exists(pitchbooksFile)) {
      let pitchbooks = await fs.readJson(pitchbooksFile);
      const index = pitchbooks.findIndex(p => p.id === id);
      if (index !== -1) {
        pitchbooks[index] = pitchbook;
        await fs.writeJson(pitchbooksFile, pitchbooks, { spaces: 2 });
      }
    }
    
    res.json({ success: true, pitchbook });
  } catch (error) {
    console.error('Error updating pitchbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pitchbook',
      message: error.message
    });
  }
});

// DELETE /api/pitchbooks/:id - Delete pitchbook
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete individual file
    const pitchbookFile = path.join(dataPath, `pitchbook_${id}.json`);
    if (await fs.exists(pitchbookFile)) {
      await fs.remove(pitchbookFile);
    }
    
    // Update main pitchbooks file
    const pitchbooksFile = path.join(dataPath, 'pitchbooks.json');
    if (await fs.exists(pitchbooksFile)) {
      let pitchbooks = await fs.readJson(pitchbooksFile);
      pitchbooks = pitchbooks.filter(p => p.id !== id);
      await fs.writeJson(pitchbooksFile, pitchbooks, { spaces: 2 });
    }
    
    res.json({ success: true, message: 'Pitchbook deleted successfully' });
  } catch (error) {
    console.error('Error deleting pitchbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete pitchbook',
      message: error.message
    });
  }
});

// Helper function to generate slide structure
function generateSlideStructure(sections) {
  const slides = [];
  let slideNumber = 1;
  
  // Add mandatory slides
  slides.push({
    slideNumber: slideNumber++,
    layoutName: 'Title Slide',
    type: 'title',
    placeholders: {}
  });
  
  slides.push({
    slideNumber: slideNumber++,
    layoutName: 'Contents',
    type: 'contents',
    placeholders: {}
  });
  
  slides.push({
    slideNumber: slideNumber++,
    layoutName: 'Legal Notice',
    type: 'legal',
    placeholders: {}
  });
  
  // Add sections
  sections.forEach(section => {
    // Section divider
    slides.push({
      slideNumber: slideNumber++,
      layoutName: 'Section Divider',
      type: 'section-divider',
      sectionTitle: section.title,
      placeholders: {}
    });
    
    // Section body slides
    for (let i = 0; i < (section.numberOfSlides || 1); i++) {
      slides.push({
        slideNumber: slideNumber++,
        layoutName: 'Body Text',
        type: 'body',
        sectionTitle: section.title,
        placeholders: {}
      });
    }
  });
  
  return slides;
}

module.exports = router;