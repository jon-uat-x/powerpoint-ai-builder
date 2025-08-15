import React, { useState, useEffect } from 'react';
import { usePitchbook } from '../contexts/PitchbookContext';
import TemplateGrid from '../components/TemplateGrid';
import TemplatePromptEditor from '../components/TemplatePromptEditor';

const Templates = () => {
  const { layouts, loadLayouts, loading } = usePitchbook();
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
  const [selectedPlaceholderInfo, setSelectedPlaceholderInfo] = useState(null);

  useEffect(() => {
    loadLayouts();
  }, []);

  const handlePromptEdit = (layoutName, placeholderId, placeholderInfo) => {
    console.log('Editing default prompt for layout', layoutName, 'placeholder', placeholderId);
    setSelectedLayout(layoutName);
    setSelectedPlaceholder(placeholderId);
    setSelectedPlaceholderInfo(placeholderInfo);
    setPromptEditorOpen(true);
  };

  const handlePromptClose = () => {
    setPromptEditorOpen(false);
    setSelectedLayout(null);
    setSelectedPlaceholder(null);
    setSelectedPlaceholderInfo(null);
  };

  const handlePromptSave = (layoutName, placeholderId, prompt) => {
    // Refresh could be handled here if needed
    console.log('Saved default prompt for', layoutName, placeholderId);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="templates-page">
      <div className="content-header">
        <h1 className="content-title">Slide Templates</h1>
        <p className="content-subtitle">
          Set default prompts for template placeholders
        </p>
      </div>

      <TemplateGrid 
        layouts={layouts}
        onPromptEdit={handlePromptEdit}
      />

      <TemplatePromptEditor
        open={promptEditorOpen}
        onClose={handlePromptClose}
        layoutName={selectedLayout}
        placeholderId={selectedPlaceholder}
        placeholderInfo={selectedPlaceholderInfo}
        onSave={handlePromptSave}
      />
    </div>
  );
};

export default Templates;