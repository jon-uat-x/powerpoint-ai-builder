import React, { useEffect, useState } from 'react';
import SlideThumbnail from './SlideThumbnail';
import { usePitchbook } from '../contexts/PitchbookContext';
import './SlideGrid.css';

const SlideGrid = ({ pitchbookId, onPromptEdit }) => {
  const { currentPitchbook, loadPitchbook, layouts, loading } = usePitchbook();
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    if (pitchbookId && (!currentPitchbook || currentPitchbook.id !== pitchbookId)) {
      loadPitchbook(pitchbookId);
    }
  }, [pitchbookId, currentPitchbook, loadPitchbook]);

  useEffect(() => {
    if (currentPitchbook && currentPitchbook.slides) {
      // Map slides with their layout information
      const slidesWithLayouts = currentPitchbook.slides.map(slide => {
        const layout = layouts.find(l => 
          l.name?.toLowerCase() === slide.layoutName?.toLowerCase() ||
          l.name?.toLowerCase().includes(slide.type?.toLowerCase())
        );
        return {
          ...slide,
          layout: layout || { name: slide.layoutName, placeholders: [] },
          prompts: currentPitchbook.prompts?.[`slide_${slide.slideNumber}`] || {}
        };
      });
      setSlides(slidesWithLayouts);
    }
  }, [currentPitchbook, layouts]);

  const handlePlaceholderClick = (slideNumber, placeholderId, placeholderInfo) => {
    if (onPromptEdit) {
      onPromptEdit(slideNumber, placeholderId, placeholderInfo);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading slides...</p>
      </div>
    );
  }

  if (!currentPitchbook) {
    return (
      <div className="empty-state">
        <p>No pitchbook selected</p>
      </div>
    );
  }

  return (
    <div className="slide-grid-container">
      <div className="slide-grid-header">
        <h2 className="slide-grid-title">{currentPitchbook.title}</h2>
        <p className="slide-grid-subtitle">
          Click on placeholders to add prompts • {slides.length} slides total
        </p>
      </div>

      <div className="slide-grid">
        {slides.map((slide, index) => (
          <SlideThumbnail
            key={`${slide.slideNumber}-${index}`}
            slide={slide}
            onPlaceholderClick={(placeholderId, placeholderInfo) => 
              handlePlaceholderClick(slide.slideNumber, placeholderId, placeholderInfo)
            }
          />
        ))}
      </div>
    </div>
  );
};

export default SlideGrid;