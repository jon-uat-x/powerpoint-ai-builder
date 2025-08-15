import React, { useState, useEffect, useRef } from 'react';
import { Modal, Box, Fade, Backdrop } from '@mui/material';
import { usePitchbook } from '../contexts/PitchbookContext';
import './PromptEditor.css';

const PromptEditor = ({ open, onClose, slideNumber, placeholderId, placeholderInfo }) => {
  const { currentPitchbook, updatePrompts } = usePitchbook();
  const [prompt, setPrompt] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (open && currentPitchbook) {
      const slideId = `slide_${slideNumber}`;
      const existingPrompt = currentPitchbook.prompts?.[slideId]?.[placeholderId] || '';
      setPrompt(existingPrompt);
      setCharCount(existingPrompt.length);
      
      // Focus textarea when modal opens
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(existingPrompt.length, existingPrompt.length);
        }
      }, 100);
    }
  }, [open, slideNumber, placeholderId, currentPitchbook]);

  const handlePromptChange = (e) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);
    setCharCount(newPrompt.length);
    
    // Auto-save with debounce
    setIsSaving(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      savePrompt(newPrompt);
    }, 1000);
  };

  const savePrompt = async (promptText) => {
    const slideId = `slide_${slideNumber}`;
    await updatePrompts(slideId, placeholderId, promptText);
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await savePrompt(prompt);
    onClose();
  };

  const handleCancel = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    onClose();
  };

  const getWordCount = () => {
    return prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  };

  const getSamplePrompts = () => {
    const type = placeholderInfo?.type || 'text';
    switch (type) {
      case 'title':
        return [
          'Generate a compelling title for this presentation',
          'Create a professional title that captures the main theme',
          'Write an engaging title in 5-7 words'
        ];
      case 'subtitle':
        return [
          'Generate a subtitle with date and company name',
          'Create a descriptive subtitle for this slide',
          'Write a brief subtitle that complements the title'
        ];
      case 'body':
        return [
          'Write 50 words about the key points',
          'Generate 3 bullet points covering main topics',
          'Create a 100-word executive summary'
        ];
      default:
        return [
          'Generate content for this placeholder',
          'Write appropriate text for this section',
          'Create relevant content based on context'
        ];
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }
      }}
    >
      <Fade in={open}>
        <Box className="prompt-editor-modal">
          <div className="prompt-editor-header">
            <h3 className="prompt-editor-title">Edit Prompt</h3>
            <div className="prompt-editor-info">
              <span className="slide-info">Slide {slideNumber}</span>
              <span className="placeholder-info">
                {placeholderInfo?.name || placeholderId}
              </span>
            </div>
          </div>

          <div className="prompt-editor-body">
            <div className="form-group">
              <label className="form-label">
                Prompt for AI Generation
                {isSaving && <span className="saving-indicator"> (Saving...)</span>}
              </label>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handlePromptChange}
                className="form-control prompt-textarea"
                placeholder="Enter your prompt here..."
                rows={6}
              />
              <div className="prompt-stats">
                <span className="char-count">
                  {charCount} characters
                </span>
                <span className="word-count">
                  {getWordCount()} words
                </span>
              </div>
            </div>

            <div className="sample-prompts">
              <h4 className="sample-title">Sample Prompts:</h4>
              <ul className="sample-list">
                {getSamplePrompts().map((sample, index) => (
                  <li 
                    key={index} 
                    className="sample-item"
                    onClick={() => setPrompt(sample)}
                  >
                    {sample}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="prompt-editor-footer">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
              disabled={isSaving}
            >
              Save Prompt
            </button>
          </div>
        </Box>
      </Fade>
    </Modal>
  );
};

export default PromptEditor;