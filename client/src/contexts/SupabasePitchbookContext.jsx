import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { pitchbookAPI, layoutAPI, generateAPI, slideAPI } from '../services/supabaseApi';

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

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Load all layouts
  const loadLayouts = useCallback(async () => {
    try {
      setLoading(true);
      const layouts = await layoutAPI.getAll();
      setLayouts(layouts);
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
      const pitchbooks = await pitchbookAPI.getAll();
      setPitchbooks(pitchbooks);
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
      const newPitchbook = await pitchbookAPI.create(data);
      setPitchbooks(prev => [...prev, newPitchbook]);
      setCurrentPitchbook(newPitchbook);
      setSuccess('Pitchbook created successfully');
      return newPitchbook;
    } catch (err) {
      setError(err.message || 'Failed to create pitchbook');
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
      const pitchbook = await pitchbookAPI.getById(id);
      setCurrentPitchbook(pitchbook);
      return pitchbook;
    } catch (err) {
      setError('Failed to load pitchbook');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update pitchbook
  const updatePitchbook = useCallback(async (id, updates) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await pitchbookAPI.update(id, updates);
      setCurrentPitchbook(updated);
      setPitchbooks(prev => prev.map(p => p.id === id ? updated : p));
      setSuccess('Pitchbook updated successfully');
      return updated;
    } catch (err) {
      setError('Failed to update pitchbook');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete pitchbook
  const deletePitchbook = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      await pitchbookAPI.delete(id);
      setPitchbooks(prev => prev.filter(p => p.id !== id));
      if (currentPitchbook?.id === id) {
        setCurrentPitchbook(null);
      }
      setSuccess('Pitchbook deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to delete pitchbook');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentPitchbook]);

  // Update slide
  const updateSlide = useCallback(async (slideId, updates) => {
    try {
      await slideAPI.update(slideId, updates);
      // Reload current pitchbook to get updated data
      if (currentPitchbook) {
        await loadPitchbook(currentPitchbook.id);
      }
    } catch (err) {
      setError('Failed to update slide');
      console.error(err);
      throw err;
    }
  }, [currentPitchbook, loadPitchbook]);

  // Update prompts
  const updatePrompts = useCallback(async (slideId, placeholderId, prompt) => {
    if (!currentPitchbook) return;

    try {
      // Find the slide
      const slide = currentPitchbook.slides?.find(s => s.id === slideId);
      if (!slide) {
        throw new Error('Slide not found');
      }

      // Prepare prompts update
      const prompts = {
        placeholderPrompts: {
          [placeholderId]: { prompt }
        }
      };

      await slideAPI.updatePrompts(slideId, prompts);
      
      // Update local state optimistically
      setCurrentPitchbook(prev => ({
        ...prev,
        slides: prev.slides.map(s => {
          if (s.id === slideId) {
            return {
              ...s,
              placeholderPrompts: {
                ...s.placeholderPrompts,
                [placeholderId]: { prompt }
              }
            };
          }
          return s;
        })
      }));

      setSuccess('Prompt updated');
    } catch (err) {
      setError('Failed to update prompt');
      console.error(err);
      throw err;
    }
  }, [currentPitchbook]);

  // Update all prompts for a pitchbook
  const updateAllPrompts = useCallback(async (pitchbookId, prompts) => {
    try {
      setLoading(true);
      const updated = await pitchbookAPI.update(pitchbookId, { prompts });
      setCurrentPitchbook(updated);
      setSuccess('All prompts updated successfully');
      return updated;
    } catch (err) {
      setError('Failed to update prompts');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate pitchbook
  const generatePitchbook = useCallback(async (pitchbookId) => {
    try {
      setLoading(true);
      setError(null);
      await generateAPI.generate(pitchbookId);
      setSuccess('Generation started');
      // Poll for status or use real-time updates
    } catch (err) {
      setError('Failed to start generation');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    // State
    currentPitchbook,
    pitchbooks,
    layouts,
    loading,
    error,
    success,
    
    // Actions
    loadLayouts,
    loadPitchbooks,
    loadPitchbook,
    createPitchbook,
    updatePitchbook,
    deletePitchbook,
    updateSlide,
    updatePrompts,
    updateAllPrompts,
    generatePitchbook,
    
    // Setters
    setCurrentPitchbook,
    setError,
    setSuccess
  };

  return (
    <PitchbookContext.Provider value={value}>
      {children}
    </PitchbookContext.Provider>
  );
};

export default PitchbookProvider;