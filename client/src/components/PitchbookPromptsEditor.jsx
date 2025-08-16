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
  Divider,
  Paper
} from '@mui/material';
import { usePitchbook } from '../contexts/PitchbookContext';

const PitchbookPromptsEditor = ({ open, onClose, pitchbook }) => {
  const [pitchbookPrompt, setPitchbookPrompt] = useState('');
  const [sectionPrompts, setSectionPrompts] = useState({});
  const [touched, setTouched] = useState(false);
  const { updatePitchbookPrompts } = usePitchbook();

  // Extract unique sections from slides
  const sections = pitchbook?.slides
    ?.filter(slide => slide.sectionTitle)
    ?.map(slide => slide.sectionTitle)
    ?.filter((value, index, self) => self.indexOf(value) === index) || [];

  useEffect(() => {
    if (pitchbook) {
      setPitchbookPrompt(pitchbook.pitchbookPrompt || '');
      setSectionPrompts(pitchbook.sectionPrompts || {});
    }
    setTouched(false);
  }, [pitchbook, open]);

  const handleSave = async () => {
    if (!pitchbook) return;
    
    await updatePitchbookPrompts(pitchbook.id, {
      pitchbookPrompt,
      sectionPrompts
    });
    onClose();
  };

  const handlePitchbookPromptChange = (e) => {
    setPitchbookPrompt(e.target.value);
    setTouched(true);
  };

  const handleSectionPromptChange = (section, value) => {
    setSectionPrompts(prev => ({
      ...prev,
      [section]: value
    }));
    setTouched(true);
  };

  const handleClose = () => {
    if (touched) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    onClose();
  };

  if (!pitchbook) return null;

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
        <Typography variant="h6" component="div">
          Pitchbook & Section Prompts
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mt: 0.5 }}>
          Add high-level prompts that apply to the entire pitchbook or specific sections
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2, overflowY: 'auto' }}>
        {/* Pitchbook-level prompt */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ color: 'var(--text-primary)', mb: 1, fontWeight: 500 }}>
            Pitchbook Prompt
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
            This prompt applies to the entire pitchbook and provides overall context and instructions
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={pitchbookPrompt}
            onChange={handlePitchbookPromptChange}
            placeholder="Enter overall instructions for the pitchbook (e.g., 'Focus on sustainability initiatives', 'Use formal business tone', 'Target enterprise clients')"
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
        </Box>

        {sections.length > 0 && (
          <>
            <Divider sx={{ my: 3, borderColor: 'var(--border-color)' }} />
            
            {/* Section-level prompts */}
            <Box>
              <Typography variant="subtitle1" sx={{ color: 'var(--text-primary)', mb: 2, fontWeight: 500 }}>
                Section Prompts
              </Typography>
              
              {sections.map((section, index) => (
                <Paper 
                  key={index} 
                  elevation={0}
                  sx={{ 
                    mb: 2, 
                    p: 2, 
                    bgcolor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'var(--text-primary)', mb: 1 }}>
                    Section: {section}
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={sectionPrompts[section] || ''}
                    onChange={(e) => handleSectionPromptChange(section, e.target.value)}
                    placeholder={`Enter specific instructions for the "${section}" section`}
                    variant="outlined"
                    size="small"
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
                </Paper>
              ))}
            </Box>
          </>
        )}

        {sections.length === 0 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255, 141, 114, 0.1)', borderRadius: 1, border: '1px solid rgba(255, 141, 114, 0.3)' }}>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              No sections found. Sections are created when slides have section titles.
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
          Save Prompts
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PitchbookPromptsEditor;