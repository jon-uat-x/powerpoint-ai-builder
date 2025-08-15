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

  // Update pitchbook prompts
  const updatePrompts = useCallback(async (slideId, placeholderId, prompt) => {
    if (!currentPitchbook) return;

    try {
      const updatedPrompts = {
        ...currentPitchbook.prompts,
        [slideId]: {
          ...currentPitchbook.prompts?.[slideId],
          [placeholderId]: prompt
        }
      };

      const updatedPitchbook = {
        ...currentPitchbook,
        prompts: updatedPrompts
      };

      setCurrentPitchbook(updatedPitchbook);

      // Debounced save to backend
      await pitchbookAPI.update(currentPitchbook.id, { prompts: updatedPrompts });
      
      // Save to local storage as draft
      localStorage.setItem(`pitchbook_draft_${currentPitchbook.id}`, JSON.stringify(updatedPitchbook));
    } catch (err) {
      setError('Failed to update prompts');
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