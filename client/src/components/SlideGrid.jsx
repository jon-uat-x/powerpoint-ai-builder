import React, { useEffect, useState, useCallback } from 'react';
import DraggableSlideThumbnail from './DraggableSlideThumbnail';
import DropZone from './DropZone';
import ConfirmDialog from './ConfirmDialog';
import SlidePromptEditor from './SlidePromptEditor';
import PitchbookPromptsEditor from './PitchbookPromptsEditor';
import ContentGenerator from './ContentGenerator';
import { usePitchbook } from '../contexts/PitchbookContext';
import './SlideGrid.css';

const SlideGrid = ({ pitchbookId, onPromptEdit }) => {
  const { currentPitchbook, loadPitchbook, layouts, loading } = usePitchbook();
  const [slides, setSlides] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState(null);
  const [slidePromptEditorOpen, setSlidePromptEditorOpen] = useState(false);
  const [selectedSlideForPrompt, setSelectedSlideForPrompt] = useState(null);
  const [pitchbookPromptsOpen, setPitchbookPromptsOpen] = useState(false);
  const [contentGeneratorOpen, setContentGeneratorOpen] = useState(false);

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

  const handleSlidePromptClick = (slide) => {
    setSelectedSlideForPrompt(slide);
    setSlidePromptEditorOpen(true);
  };

  const handleSlidePromptClose = () => {
    setSlidePromptEditorOpen(false);
    setSelectedSlideForPrompt(null);
  };

  const handlePitchbookPromptsClick = () => {
    setPitchbookPromptsOpen(true);
  };

  const handlePitchbookPromptsClose = () => {
    setPitchbookPromptsOpen(false);
  };

  const handleGenerateContentClick = () => {
    setContentGeneratorOpen(true);
  };

  const handleGenerateContentClose = () => {
    setContentGeneratorOpen(false);
  };

  const handleContentGenerated = (generatedContent) => {
    // Content has been generated and saved
    // Refresh the pitchbook to show updated content
    if (pitchbookId) {
      loadPitchbook(pitchbookId);
    }
  };

  const moveSlide = useCallback((dragIndex, targetIndex) => {
    if (dragIndex === targetIndex) return;
    
    const newSlides = [...slides];
    const draggedSlide = newSlides[dragIndex];
    
    // Remove the dragged slide from its original position
    newSlides.splice(dragIndex, 1);
    
    // Insert it at the target position
    // If dragging from a lower index to higher, we need to adjust for the removal
    const insertIndex = dragIndex < targetIndex ? targetIndex - 1 : targetIndex;
    newSlides.splice(insertIndex, 0, draggedSlide);
    
    // Update slide numbers to reflect new order
    newSlides.forEach((slide, index) => {
      slide.slideNumber = index + 1;
    });
    
    setSlides(newSlides);
    // TODO: Update pitchbook in backend
  }, [slides]);

  const insertSlide = useCallback((layout, position) => {
    const newSlide = {
      slideNumber: position + 1,
      layoutName: layout.name,
      layout: layout,
      type: layout.type || 'body',
      placeholders: {},
      prompts: {}
    };
    
    const newSlides = [...slides];
    newSlides.splice(position, 0, newSlide);
    
    // Update slide numbers
    newSlides.forEach((slide, index) => {
      slide.slideNumber = index + 1;
    });
    
    setSlides(newSlides);
    // TODO: Update pitchbook in backend
  }, [slides]);

  const handleDeleteClick = (slide) => {
    setSlideToDelete(slide);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (slideToDelete) {
      const newSlides = slides.filter(s => s.slideNumber !== slideToDelete.slideNumber);
      
      // Update slide numbers
      newSlides.forEach((slide, index) => {
        slide.slideNumber = index + 1;
      });
      
      setSlides(newSlides);
      // TODO: Update pitchbook in backend
    }
    setDeleteConfirmOpen(false);
    setSlideToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setSlideToDelete(null);
  };

  const handleDropAtEnd = useCallback((layoutOrSlide, position) => {
    if (layoutOrSlide.name) {
      // It's a layout/template
      const newSlide = {
        slideNumber: slides.length + 1,
        layoutName: layoutOrSlide.name,
        layout: layoutOrSlide,
        type: layoutOrSlide.type || 'body',
        placeholders: {},
        prompts: {}
      };
      
      setSlides([...slides, newSlide]);
    } else {
      // It's a slide being moved to the end
      const currentIndex = slides.findIndex(s => s.slideNumber === layoutOrSlide.slideNumber);
      if (currentIndex !== -1 && currentIndex !== slides.length - 1) {
        const newSlides = [...slides];
        const [movedSlide] = newSlides.splice(currentIndex, 1);
        newSlides.push(movedSlide);
        
        // Update slide numbers
        newSlides.forEach((slide, index) => {
          slide.slideNumber = index + 1;
        });
        
        setSlides(newSlides);
      }
    }
    // TODO: Update pitchbook in backend
  }, [slides]);

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
  
  // If no slides, show a large drop zone
  if (slides.length === 0) {
    return (
      <div className="slide-grid-container">
        <div className="slide-grid-header">
          <p className="slide-grid-subtitle">
            Drag templates here to start building your pitchbook
          </p>
        </div>
        <div className="slide-grid">
          <DropZone
            onDrop={handleDropAtEnd}
            position={0}
            label="Drop template here to start"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="slide-grid-container">
      <div className="slide-grid-header">
        <p className="slide-grid-subtitle">
          Click on placeholders to add prompts • {slides.length} slides total • 
          <button 
            className="pitchbook-prompts-link"
            onClick={handlePitchbookPromptsClick}
          >
            Pitchbook Prompts
          </button>
          {' • '}
          <button 
            className="generate-content-link"
            onClick={handleGenerateContentClick}
          >
            🤖 Generate Content
          </button>
        </p>
      </div>

      <div className="slide-grid">
        {slides.map((slide, index) => (
          <DraggableSlideThumbnail
            key={`${slide.slideNumber}-${index}`}
            slide={slide}
            index={index}
            moveSlide={moveSlide}
            insertSlide={insertSlide}
            onPlaceholderClick={(placeholderId, placeholderInfo) => 
              handlePlaceholderClick(slide.slideNumber, placeholderId, placeholderInfo)
            }
            onSlidePromptClick={handleSlidePromptClick}
            onDelete={handleDeleteClick}
          />
        ))}
        <DropZone
          onDrop={handleDropAtEnd}
          position={slides.length}
          label="Drop here to add at end"
        />
      </div>
      
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Slide"
        message={`Are you sure you want to delete slide ${slideToDelete?.slideNumber}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
      
      <SlidePromptEditor
        open={slidePromptEditorOpen}
        onClose={handleSlidePromptClose}
        slide={selectedSlideForPrompt}
      />
      
      <PitchbookPromptsEditor
        open={pitchbookPromptsOpen}
        onClose={handlePitchbookPromptsClose}
        pitchbook={currentPitchbook}
      />
      
      <ContentGenerator
        pitchbook={currentPitchbook}
        open={contentGeneratorOpen}
        onClose={handleGenerateContentClose}
        onGenerated={handleContentGenerated}
      />
    </div>
  );
};

export default SlideGrid;