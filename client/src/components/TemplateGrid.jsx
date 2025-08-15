import React, { useEffect, useState } from 'react';
import SlideThumbnail from './SlideThumbnail';
import { templatePromptsAPI } from '../services/api';
import './SlideGrid.css';

const TemplateGrid = ({ layouts, onPromptEdit }) => {
  const [templatePrompts, setTemplatePrompts] = useState({});

  useEffect(() => {
    loadTemplatePrompts();
  }, []);

  const loadTemplatePrompts = async () => {
    try {
      const response = await templatePromptsAPI.getAll();
      setTemplatePrompts(response.prompts || {});
    } catch (error) {
      console.error('Error loading template prompts:', error);
    }
  };

  const handlePlaceholderClick = (layoutName, placeholderId, placeholderInfo) => {
    if (onPromptEdit) {
      onPromptEdit(layoutName, placeholderId, placeholderInfo);
    }
  };

  if (!layouts || layouts.length === 0) {
    return (
      <div className="empty-state">
        <p>No templates available</p>
      </div>
    );
  }

  return (
    <div className="slide-grid-container">
      <div className="slide-grid-header">
        <h2 className="slide-grid-title">Template Library</h2>
        <p className="slide-grid-subtitle">
          Click on placeholders to set default prompts • {layouts.length} templates total
        </p>
      </div>

      <div className="slide-grid">
        {layouts.map((layout, index) => {
          const slide = {
            slideNumber: index + 1,
            layoutName: layout.name,
            layout: layout,
            prompts: templatePrompts[layout.name] || {}
          };

          return (
            <SlideThumbnail
              key={`${layout.name}-${index}`}
              slide={slide}
              onPlaceholderClick={(placeholderId, placeholderInfo) => 
                handlePlaceholderClick(layout.name, placeholderId, placeholderInfo)
              }
            />
          );
        })}
      </div>
    </div>
  );
};

export default TemplateGrid;