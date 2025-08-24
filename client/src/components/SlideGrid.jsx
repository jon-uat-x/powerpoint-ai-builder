import React, { useEffect, useState, useCallback, useRef } from 'react';
import DraggableSlideThumbnail from './DraggableSlideThumbnail';
import DropZone from './DropZone';
import ConfirmDialog from './ConfirmDialog';
import CentralizedPromptEditor from './CentralizedPromptEditor';
import PitchbookPromptsEditor from './PitchbookPromptsEditor';
import ContentGenerator from './ContentGenerator';
import { usePitchbook } from '../contexts/PitchbookContext';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import './SlideGrid.css';

const SlideGrid = ({ pitchbookId }) => {
  const { currentPitchbook, loadPitchbook, layouts, loading, updateSlides, updateSlideOrder, success, error } = usePitchbook();
  const [slides, setSlides] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState(null);
  const [centralizedPromptEditorOpen, setCentralizedPromptEditorOpen] = useState(false);
  const [selectedSlideForPrompt, setSelectedSlideForPrompt] = useState(null);
  const [pitchbookPromptsOpen, setPitchbookPromptsOpen] = useState(false);
  const [contentGeneratorOpen, setContentGeneratorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (pitchbookId && (!currentPitchbook || currentPitchbook.id !== pitchbookId)) {
      loadPitchbook(pitchbookId);
    }
  }, [pitchbookId, currentPitchbook, loadPitchbook]);

  useEffect(() => {
    if (currentPitchbook && currentPitchbook.slides) {
      // Map slides with their layout information
      const slidesWithLayouts = currentPitchbook.slides.map(slide => {
        // First try to use saved layout data
        let layout = slide.layoutData || slide.layout;
        
        // If no saved layout data, try to find it from available layouts
        if (!layout || !layout.placeholders) {
          layout = layouts.find(l => 
            l.name?.toLowerCase() === slide.layoutName?.toLowerCase() ||
            l.name?.toLowerCase().includes(slide.type?.toLowerCase())
          );
        }
        
        return {
          ...slide,
          layout: layout || { name: slide.layoutName, placeholders: [] },
          layoutData: layout,  // Ensure layoutData is preserved
          prompts: currentPitchbook.prompts?.[`slide_${slide.slideNumber}`] || {}
        };
      });
      setSlides(slidesWithLayouts);
    }
  }, [currentPitchbook, layouts]);

  const handleSlidePromptClick = (slide) => {
    setSelectedSlideForPrompt(slide);
    setCentralizedPromptEditorOpen(true);
  };

  const handleCentralizedPromptClose = () => {
    setCentralizedPromptEditorOpen(false);
    setSelectedSlideForPrompt(null);
    // Reload pitchbook to refresh prompts
    if (pitchbookId) {
      loadPitchbook(pitchbookId);
    }
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

  // Debounced save function
  const debouncedSave = useCallback((saveFunction) => {
    setIsSaving(true);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      await saveFunction();
      setIsSaving(false);
    }, 500);
  }, []);

  const moveSlide = useCallback(async (dragIndex, targetIndex) => {
    if (dragIndex === targetIndex) return;
    
    const newSlides = [...slides];
    const draggedSlide = { ...newSlides[dragIndex], movedFrom: dragIndex };
    
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
    
    // Auto-save to backend with section detection (debounced)
    if (pitchbookId) {
      debouncedSave(() => updateSlideOrder(pitchbookId, newSlides));
    }
  }, [slides, pitchbookId, updateSlideOrder, debouncedSave]);

  const insertSlide = useCallback(async (layout, position) => {
    // Detect section for the new slide
    let sectionTitle = null;
    
    // Look for section from previous slides
    if (position > 0 && slides[position - 1]) {
      sectionTitle = slides[position - 1].sectionTitle;
    } else if (position < slides.length && slides[position]) {
      // If inserting at beginning, use next slide's section
      sectionTitle = slides[position].sectionTitle;
    }
    
    const newSlide = {
      slideNumber: position + 1,
      layoutName: layout.name,
      layout: layout,  // Save complete layout object
      layoutData: layout,  // Ensure layout data is saved
      type: layout.type || 'body',
      sectionTitle: sectionTitle,
      placeholders: {},
      prompts: {},
      slidePrompt: null
    };
    
    const newSlides = [...slides];
    newSlides.splice(position, 0, newSlide);
    
    // Update slide numbers
    newSlides.forEach((slide, index) => {
      slide.slideNumber = index + 1;
    });
    
    setSlides(newSlides);
    
    // Auto-save to backend (immediate for new slides)
    if (pitchbookId) {
      setIsSaving(true);
      await updateSlides(pitchbookId, newSlides);
      setIsSaving(false);
    }
  }, [slides, pitchbookId, updateSlides]);

  const handleDeleteClick = (slide) => {
    setSlideToDelete(slide);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (slideToDelete) {
      const newSlides = slides.filter(s => s.slideNumber !== slideToDelete.slideNumber);
      
      // Update slide numbers
      newSlides.forEach((slide, index) => {
        slide.slideNumber = index + 1;
      });
      
      setSlides(newSlides);
      
      // Auto-save to backend (immediate for deletions)
      if (pitchbookId) {
        setIsSaving(true);
        await updateSlides(pitchbookId, newSlides);
        setIsSaving(false);
      }
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
            <><AutoAwesomeIcon sx={{ fontSize: 16, marginRight: 0.5, verticalAlign: 'middle' }} /> Generate Content</>
          </button>
          {isSaving && (
            <>
              {' • '}
              <span style={{ color: 'var(--success-color)', fontSize: '0.875rem' }}>
                Saving changes...
              </span>
            </>
          )}
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
      
      <CentralizedPromptEditor
        open={centralizedPromptEditorOpen}
        onClose={handleCentralizedPromptClose}
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