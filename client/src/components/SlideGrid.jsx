import React, { useEffect, useState, useCallback } from 'react';
import DraggableSlideThumbnail from './DraggableSlideThumbnail';
import DropZone from './DropZone';
import ConfirmDialog from './ConfirmDialog';
import { usePitchbook } from '../contexts/PitchbookContext';
import './SlideGrid.css';

const SlideGrid = ({ pitchbookId, onPromptEdit }) => {
  const { currentPitchbook, loadPitchbook, layouts, loading } = usePitchbook();
  const [slides, setSlides] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState(null);

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

  const moveSlide = useCallback((dragIndex, hoverIndex) => {
    const dragSlide = slides[dragIndex];
    const newSlides = [...slides];
    newSlides.splice(dragIndex, 1);
    newSlides.splice(hoverIndex, 0, dragSlide);
    
    // Update slide numbers
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
          <h2 className="slide-grid-title">{currentPitchbook.title}</h2>
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
        <h2 className="slide-grid-title">{currentPitchbook.title}</h2>
        <p className="slide-grid-subtitle">
          Click on placeholders to add prompts • {slides.length} slides total
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
    </div>
  );
};

export default SlideGrid;