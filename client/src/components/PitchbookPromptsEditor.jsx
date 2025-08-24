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
  Paper,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { usePitchbook } from '../contexts/PitchbookContext';

const PitchbookPromptsEditor = ({ open, onClose, pitchbook }) => {
  const [pitchbookPrompt, setPitchbookPrompt] = useState('');
  const [sectionPrompts, setSectionPrompts] = useState({});
  const [sectionTitles, setSectionTitles] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [touched, setTouched] = useState(false);
  const { updatePitchbookPrompts, updateSectionTitle } = usePitchbook();

  // Extract unique sections from slides
  const sections = pitchbook?.slides
    ?.filter(slide => slide.sectionTitle)
    ?.map(slide => slide.sectionTitle)
    ?.filter((value, index, self) => self.indexOf(value) === index) || [];

  useEffect(() => {
    if (pitchbook) {
      setPitchbookPrompt(pitchbook.pitchbookPrompt || '');
      setSectionPrompts(pitchbook.sectionPrompts || {});
      
      // Initialize section titles
      const titles = {};
      sections.forEach(section => {
        titles[section] = section;
      });
      setSectionTitles(titles);
    }
    setTouched(false);
    setEditingSection(null);
  }, [pitchbook, open]);

  const handleSave = async () => {
    if (!pitchbook) return;
    
    // Save prompts
    await updatePitchbookPrompts(pitchbook.id, {
      pitchbookPrompt,
      sectionPrompts
    });
    
    // Save any changed section titles
    for (const [oldTitle, newTitle] of Object.entries(sectionTitles)) {
      if (oldTitle !== newTitle && newTitle.trim()) {
        await updateSectionTitle(pitchbook.id, oldTitle, newTitle);
      }
    }
    
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

  const handleStartEditSection = (section) => {
    setEditingSection(section);
    setEditedTitle(sectionTitles[section] || section);
  };

  const handleSaveEditSection = () => {
    if (editedTitle.trim() && editingSection) {
      // Update the section title in our local state
      const newSectionTitles = { ...sectionTitles };
      const newSectionPrompts = { ...sectionPrompts };
      
      // If the title changed, update the prompts mapping
      if (editingSection !== editedTitle) {
        newSectionTitles[editingSection] = editedTitle;
        
        // Move the prompt to the new title if it exists
        if (sectionPrompts[editingSection]) {
          newSectionPrompts[editedTitle] = sectionPrompts[editingSection];
          delete newSectionPrompts[editingSection];
        }
      }
      
      setSectionTitles(newSectionTitles);
      setSectionPrompts(newSectionPrompts);
      setTouched(true);
    }
    setEditingSection(null);
    setEditedTitle('');
  };

  const handleCancelEditSection = () => {
    setEditingSection(null);
    setEditedTitle('');
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
              
              {sections.map((section, index) => {
                const currentTitle = sectionTitles[section] || section;
                const isEditing = editingSection === section;
                
                return (
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
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {isEditing ? (
                        <>
                          <TextField
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            size="small"
                            sx={{
                              flex: 1,
                              mr: 1,
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
                          <IconButton 
                            size="small" 
                            onClick={handleSaveEditSection}
                            sx={{ color: 'var(--success-color)' }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={handleCancelEditSection}
                            sx={{ color: 'var(--text-secondary)' }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <Typography variant="subtitle2" sx={{ color: 'var(--text-primary)', flex: 1 }}>
                            Section: {currentTitle}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => handleStartEditSection(section)}
                            sx={{ color: 'var(--text-secondary)' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={sectionPrompts[currentTitle] || sectionPrompts[section] || ''}
                      onChange={(e) => handleSectionPromptChange(currentTitle, e.target.value)}
                      placeholder={`Enter specific instructions for the "${currentTitle}" section`}
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
                );
              })}
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
          Save All Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PitchbookPromptsEditor;