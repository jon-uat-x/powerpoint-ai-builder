const express = require('express');
const router = express.Router();
const templatePromptsService = require('../services/templatePromptsService');

// GET /api/template-prompts - Get all template prompts
router.get('/', async (req, res) => {
  try {
    const prompts = await templatePromptsService.getAllPrompts();
    res.json({
      success: true,
      prompts
    });
  } catch (error) {
    console.error('Error fetching template prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template prompts',
      message: error.message
    });
  }
});

// GET /api/template-prompts/:layoutName - Get prompts for specific layout
router.get('/:layoutName', async (req, res) => {
  try {
    const { layoutName } = req.params;
    const prompts = await templatePromptsService.getPrompts(layoutName);
    res.json({
      success: true,
      layoutName,
      prompts
    });
  } catch (error) {
    console.error('Error fetching layout prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch layout prompts',
      message: error.message
    });
  }
});

// PUT /api/template-prompts/:layoutName - Update prompts for a layout
router.put('/:layoutName', async (req, res) => {
  try {
    const { layoutName } = req.params;
    const { prompts } = req.body;
    
    const success = await templatePromptsService.savePrompts(layoutName, prompts);
    
    if (success) {
      res.json({
        success: true,
        message: 'Template prompts updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update template prompts'
      });
    }
  } catch (error) {
    console.error('Error updating template prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template prompts',
      message: error.message
    });
  }
});

// PATCH /api/template-prompts/:layoutName/:placeholderId - Update single prompt
router.patch('/:layoutName/:placeholderId', async (req, res) => {
  try {
    const { layoutName, placeholderId } = req.params;
    const { prompt } = req.body;
    
    // Allow empty prompts
    const success = await templatePromptsService.updatePrompt(layoutName, placeholderId, prompt);
    
    if (success) {
      res.json({
        success: true,
        message: 'Prompt updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update prompt'
      });
    }
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prompt',
      message: error.message
    });
  }
});

// DELETE /api/template-prompts/:layoutName/:placeholderId - Delete a prompt
router.delete('/:layoutName/:placeholderId', async (req, res) => {
  try {
    const { layoutName, placeholderId } = req.params;
    
    const success = await templatePromptsService.deletePrompt(layoutName, placeholderId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Prompt deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete prompt'
      });
    }
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete prompt',
      message: error.message
    });
  }
});

module.exports = router;