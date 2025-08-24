import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import './SlideThumbnail.css';

const SlideThumbnail = ({ slide, onDelete, onSlidePromptClick, showDelete = false }) => {
  const renderPlaceholder = (placeholder) => {
    const hasPrompt = slide.prompts && slide.prompts[placeholder.id];

    return (
      <div
        key={placeholder.id}
        className={`thumbnail-placeholder ${placeholder.type} ${hasPrompt ? 'has-prompt' : ''}`}
        style={{
          left: `${(placeholder.x / 1024) * 100}%`,
          top: `${(placeholder.y / 768) * 100}%`,
          width: `${(placeholder.width / 1024) * 100}%`,
          height: `${(placeholder.height / 768) * 100}%`
        }}
      >
        {hasPrompt && <span className="prompt-indicator"><CheckCircleOutlineIcon sx={{ fontSize: 14 }} /></span>}
        <div className="placeholder-content">
          <span className="placeholder-label">
            {placeholder.name || placeholder.type}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="slide-thumbnail">
      <div className="thumbnail-header">
        <span className="thumbnail-number">{slide.slideNumber}</span>
        <span className="thumbnail-title">{slide.layoutName || slide.type}</span>
        <button
          className={`slide-prompt-btn ${slide.slidePrompt || Object.keys(slide.prompts || {}).length > 0 ? 'has-prompt' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onSlidePromptClick) onSlidePromptClick(slide);
          }}
          title="Edit all prompts for this slide"
        >
          <AddIcon sx={{ fontSize: 18 }} />
        </button>
      </div>
      
      <div className="thumbnail-content">
        <div className="thumbnail-preview">
          {slide.layout?.placeholders?.map(placeholder => 
            renderPlaceholder(placeholder)
          )}
          {(!slide.layout?.placeholders || slide.layout.placeholders.length === 0) && (
            <div className="thumbnail-empty">
              <span>{slide.layoutName || 'No layout'}</span>
            </div>
          )}
        </div>
      </div>

      {slide.sectionTitle && (
        <div className="thumbnail-section">
          Section: {slide.sectionTitle}
        </div>
      )}

      <div className="thumbnail-footer">
        <span className="prompt-count">
          {Object.keys(slide.prompts || {}).length} / {slide.layout?.placeholders?.length || 0} prompts
          {slide.slidePrompt && ' + slide'}
        </span>
        {showDelete && (
          <button 
            className="delete-slide-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(slide);
            }}
            title="Delete slide"
          >
            <DeleteIcon sx={{ fontSize: 18 }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SlideThumbnail;