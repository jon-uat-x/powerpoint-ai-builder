import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  Box, 
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { usePitchbook } from '../contexts/PitchbookContext';

const CentralizedPromptEditor = ({ open, onClose, slide }) => {
  const [slidePrompt, setSlidePrompt] = useState('');
  const [placeholderPrompts, setPlaceholderPrompts] = useState({});
  const [expandedSection, setExpandedSection] = useState('slide-prompt');
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPrompts, setInitialPrompts] = useState({});
  const { updateSlidePrompt, updatePrompts } = usePitchbook();

  useEffect(() => {
    if (slide) {
      // Initialize slide prompt
      setSlidePrompt(slide.slidePrompt || '');
      
      // Initialize placeholder prompts
      const prompts = {};
      if (slide.layout?.placeholders) {
        slide.layout.placeholders.forEach(placeholder => {
          prompts[placeholder.id] = slide.prompts?.[placeholder.id] || '';
        });
      }
      setPlaceholderPrompts(prompts);
      
      // Store initial state for change detection
      setInitialPrompts({
        slidePrompt: slide.slidePrompt || '',
        ...prompts
      });
      
      setHasChanges(false);
      setExpandedSection('slide-prompt');
    }
  }, [slide]);

  // Sort placeholders by Y position (top to bottom)
  const getSortedPlaceholders = () => {
    if (!slide?.layout?.placeholders) return [];
    return [...slide.layout.placeholders].sort((a, b) => a.y - b.y);
  };

  const handleSlidePromptChange = (e) => {
    const newValue = e.target.value;
    setSlidePrompt(newValue);
    checkForChanges({ slidePrompt: newValue });
  };

  const handlePlaceholderPromptChange = (placeholderId, value) => {
    const newPrompts = { ...placeholderPrompts, [placeholderId]: value };
    setPlaceholderPrompts(newPrompts);
    checkForChanges({ [placeholderId]: value });
  };

  const checkForChanges = (updates) => {
    const current = {
      slidePrompt,
      ...placeholderPrompts,
      ...updates
    };
    
    const hasAnyChanges = Object.keys(initialPrompts).some(key => 
      current[key] !== initialPrompts[key]
    );
    
    setHasChanges(hasAnyChanges);
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? panel : false);
  };

  const handleSave = async () => {
    if (!slide) return;
    
    try {
      // Save slide prompt if changed
      if (slidePrompt !== initialPrompts.slidePrompt) {
        await updateSlidePrompt(slide.slideNumber, slidePrompt);
      }
      
      // Save placeholder prompts if changed
      const slideId = `slide_${slide.slideNumber}`;
      for (const [placeholderId, prompt] of Object.entries(placeholderPrompts)) {
        if (prompt !== initialPrompts[placeholderId]) {
          await updatePrompts(slideId, placeholderId, prompt);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save prompts:', error);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    onClose();
  };

  const getCharCount = (text) => text.length;
  const getWordCount = (text) => text.trim() ? text.trim().split(/\s+/).length : 0;

  if (!slide) return null;

  const sortedPlaceholders = getSortedPlaceholders();

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'var(--bg-card)',
          backgroundImage: 'none',
          border: '1px solid var(--border-color)',
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div">
            Edit All Prompts - Slide {slide.slideNumber}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            {slide.layoutName || 'No layout'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2, p: 2 }}>
        {/* Slide Prompt Section */}
        <Accordion 
          expanded={expandedSection === 'slide-prompt'}
          onChange={handleAccordionChange('slide-prompt')}
          sx={{
            bgcolor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            mb: 2,
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: 'var(--text-secondary)' }} />}
            sx={{ 
              '& .MuiAccordionSummary-content': { 
                alignItems: 'center',
                gap: 2
              }
            }}
          >
            <Typography sx={{ color: 'var(--text-primary)' }}>
              Overall Slide Prompt
            </Typography>
            {slidePrompt && (
              <Chip 
                icon={<CheckCircleOutlineIcon />}
                label="Has prompt"
                size="small"
                color="success"
                variant="outlined"
                sx={{ ml: 'auto', mr: 2 }}
              />
            )}
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
                This prompt applies to the entire slide and provides general context for all content generation.
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={slidePrompt}
                onChange={handleSlidePromptChange}
                placeholder="Enter a prompt that applies to this entire slide..."
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'var(--text-primary)',
                    '& fieldset': {
                      borderColor: 'var(--border-color)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--border-hover)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--primary-color)',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: 'var(--text-primary)',
                  },
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                  {getCharCount(slidePrompt)} characters
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                  {getWordCount(slidePrompt)} words
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Placeholder Prompts Sections */}
        {sortedPlaceholders.map((placeholder, index) => {
          const prompt = placeholderPrompts[placeholder.id] || '';
          const panelId = `placeholder-${placeholder.id}`;
          
          return (
            <Accordion 
              key={placeholder.id}
              expanded={expandedSection === panelId}
              onChange={handleAccordionChange(panelId)}
              sx={{
                bgcolor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                mb: 1,
                '&:before': { display: 'none' }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'var(--text-secondary)' }} />}
                sx={{ 
                  '& .MuiAccordionSummary-content': { 
                    alignItems: 'center',
                    gap: 2
                  }
                }}
              >
                <Typography sx={{ color: 'var(--text-primary)' }}>
                  {placeholder.name || placeholder.type || `Placeholder ${index + 1}`}
                </Typography>
                <Chip 
                  label={placeholder.type}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
                {prompt && (
                  <Chip 
                    icon={<CheckCircleOutlineIcon />}
                    label="Has prompt"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ ml: 'auto', mr: 2 }}
                  />
                )}
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
                    Prompt for {placeholder.type} content in this placeholder.
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={prompt}
                    onChange={(e) => handlePlaceholderPromptChange(placeholder.id, e.target.value)}
                    placeholder={`Enter prompt for ${placeholder.name || placeholder.type}...`}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'var(--text-primary)',
                        '& fieldset': {
                          borderColor: 'var(--border-color)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'var(--border-hover)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'var(--primary-color)',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: 'var(--text-primary)',
                      },
                    }}
                  />
                  <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                      {getCharCount(prompt)} characters
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                      {getWordCount(prompt)} words
                    </Typography>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
        
        {sortedPlaceholders.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: 'var(--text-muted)' }}>
              No placeholders available for this slide layout
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ borderTop: '1px solid var(--border-color)', p: 2 }}>
        <Button 
          onClick={handleClose}
          sx={{ color: 'var(--text-secondary)' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          disabled={!hasChanges}
          sx={{
            bgcolor: 'var(--primary-color)',
            color: 'white',
            '&:hover': {
              bgcolor: 'var(--primary-hover)',
            },
            '&.Mui-disabled': {
              bgcolor: 'var(--border-color)',
              color: 'var(--text-muted)',
            }
          }}
        >
          Save All Prompts
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CentralizedPromptEditor;