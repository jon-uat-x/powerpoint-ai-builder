import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { pitchbookAPI, layoutAPI, generateAPI } from '../services/api';

const PitchbookContext = createContext();

export const usePitchbook = () => {
  const context = useContext(PitchbookContext);
  if (!context) {
    throw new Error('usePitchbook must be used within a PitchbookProvider');
  }
  return context;
};

export const PitchbookProvider = ({ children }) => {
  const [currentPitchbook, setCurrentPitchbook] = useState(null);
  const [pitchbooks, setPitchbooks] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load layouts on mount
  useEffect(() => {
    loadLayouts();
    loadPitchbooks();
  }, []);

  // Load all layouts
  const loadLayouts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await layoutAPI.getAll();
      setLayouts(response.layouts || []);
    } catch (err) {
      setError('Failed to load layouts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all pitchbooks
  const loadPitchbooks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await pitchbookAPI.getAll();
      setPitchbooks(response.pitchbooks || []);
    } catch (err) {
      setError('Failed to load pitchbooks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new pitchbook
  const createPitchbook = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      const response = await pitchbookAPI.create(data);
      const newPitchbook = response.pitchbook;
      setPitchbooks(prev => [...prev, newPitchbook]);
      setCurrentPitchbook(newPitchbook);
      setSuccess('Pitchbook created successfully');
      return newPitchbook;
    } catch (err) {
      setError('Failed to create pitchbook');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load specific pitchbook
  const loadPitchbook = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await pitchbookAPI.getById(id);
      setCurrentPitchbook(response.pitchbook);
      return response.pitchbook;
    } catch (err) {
      setError('Failed to load pitchbook');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update placeholder prompts with proper scoping
  const updatePrompts = useCallback(async (slideId, placeholderId, prompt) => {
    if (!currentPitchbook) return;

    try {
      // Find the slide to get more context
      const slideNumber = parseInt(slideId.replace('slide_', ''));
      const slide = currentPitchbook.slides?.find(s => s.slideNumber === slideNumber);
      
      const updatedPrompts = {
        ...currentPitchbook.prompts,
        [slideId]: {
          ...currentPitchbook.prompts?.[slideId],
          [placeholderId]: prompt
        }
      };

      // Create scoped prompts structure
      const scopedPlaceholderPrompts = {
        ...currentPitchbook.scopedPlaceholderPrompts,
        [slideId]: {
          ...currentPitchbook.scopedPlaceholderPrompts?.[slideId],
          [placeholderId]: {
            scope: 'placeholder',
            slideNumber: slideNumber,
            slideTitle: slide?.layoutName || slide?.type,
            placeholderId: placeholderId,
            text: prompt,
            appliesTo: `slide_${slideNumber}_placeholder_${placeholderId}`
          }
        }
      };

      const updatedPitchbook = {
        ...currentPitchbook,
        prompts: updatedPrompts,
        scopedPlaceholderPrompts
      };

      setCurrentPitchbook(updatedPitchbook);

      // Debounced save to backend
      await pitchbookAPI.update(currentPitchbook.id, { 
        prompts: updatedPrompts,
        scopedPlaceholderPrompts 
      });
      
      // Save to local storage as draft
      localStorage.setItem(`pitchbook_draft_${currentPitchbook.id}`, JSON.stringify(updatedPitchbook));
    } catch (err) {
      setError('Failed to update prompts');
      console.error(err);
    }
  }, [currentPitchbook]);

  // Update slide prompt with proper scoping
  const updateSlidePrompt = useCallback(async (slideNumber, prompt) => {
    if (!currentPitchbook) return;

    try {
      const updatedSlides = currentPitchbook.slides.map(slide => {
        if (slide.slideNumber === slideNumber) {
          return { 
            ...slide, 
            slidePrompt: prompt,
            slidePromptScoped: {
              scope: 'slide',
              slideNumber: slideNumber,
              slideTitle: slide.layoutName || slide.type,
              text: prompt,
              appliesTo: `slide_${slideNumber}_only`
            }
          };
        }
        return slide;
      });

      const updatedPitchbook = {
        ...currentPitchbook,
        slides: updatedSlides
      };

      setCurrentPitchbook(updatedPitchbook);

      // Save to backend
      await pitchbookAPI.update(currentPitchbook.id, { slides: updatedSlides });
      
      // Save to local storage as draft
      localStorage.setItem(`pitchbook_draft_${currentPitchbook.id}`, JSON.stringify(updatedPitchbook));
      
      setSuccess('Slide prompt saved');
    } catch (err) {
      setError('Failed to update slide prompt');
      console.error(err);
    }
  }, [currentPitchbook]);

  // Update all slides at once (for reordering, adding, deleting)
  const updateSlides = useCallback(async (pitchbookId, slides) => {
    if (!currentPitchbook || currentPitchbook.id !== pitchbookId) return;

    try {
      // Update local state immediately for responsiveness
      const updatedPitchbook = {
        ...currentPitchbook,
        slides: slides
      };
      
      setCurrentPitchbook(updatedPitchbook);

      // Save to backend
      await pitchbookAPI.update(pitchbookId, { 
        slides: slides.map(slide => ({
          slideNumber: slide.slideNumber,
          layoutName: slide.layoutName,
          layoutData: slide.layout || null,
          type: slide.type || slide.layout?.type || 'body',
          sectionTitle: slide.sectionTitle || null,
          prompts: slide.prompts || {},
          slidePrompt: slide.slidePrompt || null
        }))
      });
      
      // Save to local storage as draft
      localStorage.setItem(`pitchbook_draft_${pitchbookId}`, JSON.stringify(updatedPitchbook));
      
      setSuccess('Changes saved');
    } catch (err) {
      setError('Failed to save changes');
      console.error(err);
      // Revert on error
      setCurrentPitchbook(currentPitchbook);
    }
  }, [currentPitchbook]);

  // Update slide order with automatic section detection
  const updateSlideOrder = useCallback(async (pitchbookId, slides) => {
    if (!currentPitchbook || currentPitchbook.id !== pitchbookId) return;

    try {
      // Detect and update section titles based on position
      const slidesWithSections = slides.map((slide, index) => {
        // If slide already has a section, keep it unless we need to update
        let sectionTitle = slide.sectionTitle;
        
        // If this slide was moved, detect new section
        if (slide.movedFrom !== undefined) {
          // Look for section from previous slides
          for (let i = index - 1; i >= 0; i--) {
            if (slides[i].sectionTitle && !slides[i].movedFrom) {
              sectionTitle = slides[i].sectionTitle;
              break;
            }
          }
          
          // If no section found before, check after
          if (!sectionTitle && index < slides.length - 1) {
            for (let i = index + 1; i < slides.length; i++) {
              if (slides[i].sectionTitle && !slides[i].movedFrom) {
                sectionTitle = slides[i].sectionTitle;
                break;
              }
            }
          }
          
          // Clean up the movedFrom flag
          delete slide.movedFrom;
        }
        
        return {
          ...slide,
          sectionTitle
        };
      });

      // Update using the main updateSlides function
      await updateSlides(pitchbookId, slidesWithSections);
    } catch (err) {
      setError('Failed to update slide order');
      console.error(err);
    }
  }, [currentPitchbook, updateSlides]);

  // Update section title
  const updateSectionTitle = useCallback(async (pitchbookId, oldTitle, newTitle) => {
    if (!currentPitchbook || currentPitchbook.id !== pitchbookId) return;

    try {
      // Update all slides with the old section title
      const updatedSlides = currentPitchbook.slides.map(slide => {
        if (slide.sectionTitle === oldTitle) {
          return { ...slide, sectionTitle: newTitle };
        }
        return slide;
      });

      const updatedPitchbook = {
        ...currentPitchbook,
        slides: updatedSlides
      };

      setCurrentPitchbook(updatedPitchbook);

      // Save to backend
      await pitchbookAPI.update(pitchbookId, { slides: updatedSlides });
      
      // Save to local storage as draft
      localStorage.setItem(`pitchbook_draft_${pitchbookId}`, JSON.stringify(updatedPitchbook));
      
      setSuccess('Section title updated');
    } catch (err) {
      setError('Failed to update section title');
      console.error(err);
    }
  }, [currentPitchbook]);

  // Update pitchbook and section prompts with proper scoping
  const updatePitchbookPrompts = useCallback(async (pitchbookId, prompts) => {
    if (!currentPitchbook || currentPitchbook.id !== pitchbookId) return;

    try {
      // Structure prompts with clear scope identification
      const scopedPrompts = {
        ...currentPitchbook.scopedPrompts,
        pitchbook: {
          scope: 'pitchbook',
          text: prompts.pitchbookPrompt,
          appliesTo: 'entire_presentation'
        },
        sections: Object.entries(prompts.sectionPrompts || {}).reduce((acc, [sectionName, promptText]) => {
          acc[sectionName] = {
            scope: 'section',
            sectionName: sectionName,
            text: promptText,
            appliesTo: `all_slides_in_section_${sectionName}`
          };
          return acc;
        }, {})
      };

      const updatedPitchbook = {
        ...currentPitchbook,
        pitchbookPrompt: prompts.pitchbookPrompt,
        sectionPrompts: prompts.sectionPrompts,
        scopedPrompts
      };

      setCurrentPitchbook(updatedPitchbook);

      // Save to backend
      await pitchbookAPI.update(pitchbookId, { 
        pitchbookPrompt: prompts.pitchbookPrompt,
        sectionPrompts: prompts.sectionPrompts,
        scopedPrompts 
      });
      
      // Save to local storage as draft
      localStorage.setItem(`pitchbook_draft_${pitchbookId}`, JSON.stringify(updatedPitchbook));
      
      setSuccess('Pitchbook prompts saved');
    } catch (err) {
      setError('Failed to update pitchbook prompts');
      console.error(err);
    }
  }, [currentPitchbook]);

  // Generate content
  const generateContent = useCallback(async () => {
    if (!currentPitchbook) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess('Generating content...');
      
      const response = await generateAPI.generate(currentPitchbook.id);
      
      // Reload pitchbook to get generated content
      await loadPitchbook(currentPitchbook.id);
      
      setSuccess('Content generated successfully');
      return response;
    } catch (err) {
      setError('Failed to generate content');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentPitchbook, loadPitchbook]);

  // Check generation status
  const checkGenerationStatus = useCallback(async () => {
    if (!currentPitchbook) return;

    try {
      const response = await generateAPI.getStatus(currentPitchbook.id);
      return response;
    } catch (err) {
      console.error('Failed to check generation status:', err);
      return null;
    }
  }, [currentPitchbook]);

  // Clear messages
  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccess(null), []);

  // Get layout by name
  const getLayoutByName = useCallback((name) => {
    return layouts.find(layout => 
      layout.name?.toLowerCase() === name?.toLowerCase() ||
      layout.fileName?.toLowerCase().includes(name?.toLowerCase())
    );
  }, [layouts]);

  const value = {
    currentPitchbook,
    pitchbooks,
    layouts,
    loading,
    error,
    success,
    setCurrentPitchbook,
    createPitchbook,
    loadPitchbook,
    loadPitchbooks,
    updatePrompts,
    updateSlidePrompt,
    updateSlides,
    updateSlideOrder,
    updateSectionTitle,
    updatePitchbookPrompts,
    generateContent,
    checkGenerationStatus,
    clearError,
    clearSuccess,
    getLayoutByName,
    loadLayouts
  };

  return (
    <PitchbookContext.Provider value={value}>
      {children}
    </PitchbookContext.Provider>
  );
};