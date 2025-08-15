import React, { useState, useEffect } from 'react';
import { Modal, Box, Fade, Backdrop } from '@mui/material';
import { templatePromptsAPI } from '../services/api';
import './PromptEditor.css';

const TemplatePromptEditor = ({ 
  open, 
  onClose, 
  layoutName, 
  placeholderId, 
  placeholderInfo,
  onSave 
}) => {
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveTimer, setSaveTimer] = useState(null);

  useEffect(() => {
    if (open && layoutName && placeholderId) {
      loadPrompt();
    }
  }, [open, layoutName, placeholderId]);

  const loadPrompt = async () => {
    try {
      const response = await templatePromptsAPI.getByLayout(layoutName);
      const prompts = response.prompts || {};
      setPrompt(prompts[placeholderId] || '');
    } catch (error) {
      console.error('Error loading template prompt:', error);
      setPrompt('');
    }
  };

  const handlePromptChange = (e) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);

    // Clear existing timer
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    // Set new timer for auto-save
    const timer = setTimeout(() => {
      savePrompt(newPrompt);
    }, 500); // 500ms debounce

    setSaveTimer(timer);
  };

  const savePrompt = async (promptText) => {
    setSaving(true);
    try {
      await templatePromptsAPI.updateSingle(layoutName, placeholderId, promptText);
      if (onSave) {
        onSave(layoutName, placeholderId, promptText);
      }
    } catch (error) {
      console.error('Error saving template prompt:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    onClose();
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '600px',
    bgcolor: 'var(--bg-secondary)',
    boxShadow: 24,
    borderRadius: '8px',
    outline: 'none',
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
        sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)' }
      }}
    >
      <Fade in={open}>
        <Box sx={modalStyle}>
          <div className="prompt-editor">
            <div className="prompt-editor-header">
              <h2>Edit Default Prompt</h2>
              <p className="prompt-editor-subtitle">
                Template: {layoutName}
              </p>
              <p className="prompt-editor-subtitle">
                Placeholder: {placeholderInfo?.name || placeholderId}
              </p>
            </div>

            <div className="prompt-editor-body">
              <label className="prompt-label">
                Default Prompt for {placeholderInfo?.name || 'Placeholder'}
              </label>
              <textarea
                className="prompt-textarea"
                value={prompt}
                onChange={handlePromptChange}
                placeholder="Enter a default prompt that will be inherited by new pitchbooks using this template..."
                rows={8}
              />
              <div className="prompt-editor-status">
                {saving ? (
                  <span className="saving-indicator">Saving...</span>
                ) : (
                  <span className="saved-indicator">Auto-saved</span>
                )}
              </div>
              <p className="prompt-editor-hint">
                This default prompt will be inherited when creating new pitchbooks. 
                Leave empty if no default prompt is needed.
              </p>
            </div>

            <div className="prompt-editor-footer">
              <button onClick={handleClose} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </Box>
      </Fade>
    </Modal>
  );
};

export default TemplatePromptEditor;