import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Typography } from '@mui/material';
import { usePitchbook } from '../contexts/PitchbookContext';

const SlidePromptEditor = ({ open, onClose, slide }) => {
  const [prompt, setPrompt] = useState('');
  const [touched, setTouched] = useState(false);
  const { updateSlidePrompt } = usePitchbook();

  useEffect(() => {
    if (slide?.slidePrompt) {
      setPrompt(slide.slidePrompt);
    } else {
      setPrompt('');
    }
    setTouched(false);
  }, [slide]);

  const handleSave = async () => {
    if (!slide) return;
    
    await updateSlidePrompt(slide.slideNumber, prompt);
    onClose();
  };

  const handleChange = (e) => {
    setPrompt(e.target.value);
    setTouched(true);
  };

  const handleClose = () => {
    if (touched) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    onClose();
  };

  if (!slide) return null;

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
        }
      }}
    >
      <DialogTitle sx={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div">
            Slide {slide.slideNumber} - Overall Slide Prompt
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            {slide.layoutName || 'No layout'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>
            This prompt applies to the entire slide and provides general context for all content generation.
          </Typography>
        </Box>
        
        <TextField
          autoFocus
          margin="dense"
          label="Slide Prompt"
          fullWidth
          multiline
          rows={6}
          value={prompt}
          onChange={handleChange}
          placeholder="Enter a prompt that applies to this entire slide (e.g., 'Focus on Q3 2024 results', 'Use conservative tone', 'Include market comparison')"
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
            '& .MuiInputLabel-root': {
              color: 'var(--text-secondary)',
            },
            '& .MuiInputBase-input': {
              color: 'var(--text-primary)',
            },
          }}
        />
        
        {prompt && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0, 100, 80, 0.1)', borderRadius: 1, border: '1px solid rgba(0, 150, 120, 0.3)' }}>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
              Preview: This prompt will be combined with individual placeholder prompts
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
          disabled={!touched}
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
          Save Prompt
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SlidePromptEditor;