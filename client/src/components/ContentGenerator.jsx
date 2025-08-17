import React, { useState, useEffect } from 'react';
import aiContentGenerator from '../services/aiContentGenerator';
import promptEnhancer from '../services/promptEnhancer';
import { usePitchbook } from '../contexts/PitchbookContext';
import './ContentGenerator.css';

const ContentGenerator = ({ pitchbook, open, onClose, onGenerated }) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSlides, setSelectedSlides] = useState([]);
  const [options, setOptions] = useState({
    regenerate: false,
    includeVariations: false,
    autoReview: true
  });
  const [enhancedPrompts, setEnhancedPrompts] = useState({});
  const [showPreview, setShowPreview] = useState(false);

  const { updatePitchbook } = usePitchbook();

  useEffect(() => {
    if (pitchbook) {
      // Get enhanced prompts for preview
      const enhanced = promptEnhancer.enhanceAllPrompts(pitchbook);
      setEnhancedPrompts(enhanced);
      
      // Select all slides by default
      const allSlideKeys = Object.keys(pitchbook.prompts || {});
      setSelectedSlides(allSlideKeys);
    }
  }, [pitchbook]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setProgress(0);
    setCurrentTask('Initializing AI generator...');

    try {
      // Generate content for the pitchbook
      const generationResult = await aiContentGenerator.generatePitchbookContent(
        pitchbook,
        {
          regenerate: options.regenerate,
          selectedSlides: selectedSlides.length > 0 ? selectedSlides : null,
          onProgress: (prog) => {
            setProgress(prog.percentage);
            setCurrentTask(`Processing prompt ${prog.current} of ${prog.total}...`);
          }
        }
      );

      if (generationResult.success) {
        setResults(generationResult.results);
        setCurrentTask('Generation complete!');
        
        // Auto-review if enabled
        if (options.autoReview) {
          setCurrentTask('Reviewing and improving content...');
          await reviewContent(generationResult.results);
        }
        
        // Update pitchbook with generated content
        await saveToPitchbook(generationResult.results);
        
        // Generate executive summary
        if (options.includeVariations) {
          setCurrentTask('Generating executive summary...');
          const summary = await aiContentGenerator.generateExecutiveSummary({
            ...pitchbook,
            generatedContent: generationResult.results
          });
          
          if (summary.success) {
            setResults(prev => ({
              ...prev,
              executiveSummary: summary.summary
            }));
          }
        }
      } else {
        setError('Generation failed. Please try again.');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred during generation');
    } finally {
      setGenerating(false);
      setProgress(100);
    }
  };

  const reviewContent = async (content) => {
    // Review and improve each piece of generated content
    const reviewed = {};
    
    for (const [slideKey, slideContent] of Object.entries(content)) {
      reviewed[slideKey] = {};
      
      for (const [placeholderKey, result] of Object.entries(slideContent)) {
        if (result.success && result.content) {
          const improved = await aiContentGenerator.reviewAndImprove(
            result.content,
            { targetAudience: getTargetAudience() }
          );
          
          reviewed[slideKey][placeholderKey] = {
            ...result,
            content: improved.improved,
            originalContent: result.content
          };
        } else {
          reviewed[slideKey][placeholderKey] = result;
        }
      }
    }
    
    return reviewed;
  };

  const saveToPitchbook = async (generatedContent) => {
    // Merge generated content with existing pitchbook
    const updatedPitchbook = {
      ...pitchbook,
      generatedContent: {
        ...pitchbook.generatedContent,
        ...generatedContent
      },
      lastGenerated: new Date().toISOString()
    };
    
    // Save to context/backend
    await updatePitchbook(pitchbook.id, updatedPitchbook);
    
    if (onGenerated) {
      onGenerated(generatedContent);
    }
  };

  const getTargetAudience = () => {
    // Determine target audience based on pitchbook type
    switch (pitchbook?.type) {
      case 'investor':
        return 'investors and venture capitalists';
      case 'executive':
        return 'C-level executives and board members';
      case 'sales':
        return 'potential customers and partners';
      default:
        return 'business professionals';
    }
  };

  const handleSlideToggle = (slideKey) => {
    setSelectedSlides(prev => {
      if (prev.includes(slideKey)) {
        return prev.filter(s => s !== slideKey);
      } else {
        return [...prev, slideKey];
      }
    });
  };

  const handleRegenerateSlide = async (slideKey) => {
    setGenerating(true);
    setCurrentTask(`Regenerating content for ${slideKey}...`);
    
    try {
      const slideNumber = parseInt(slideKey.replace('slide_', ''));
      const result = await aiContentGenerator.generateSlideContent(pitchbook, slideNumber);
      
      setResults(prev => ({
        ...prev,
        [slideKey]: result.results
      }));
      
      await saveToPitchbook({
        ...results,
        [slideKey]: result.results
      });
    } catch (err) {
      setError(`Failed to regenerate ${slideKey}: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (!pitchbook || !open) return null;

  return (
    <div className="content-generator-overlay">
      <div className="content-generator-dialog">
        <div className="generator-header">
          <h2>AI Content Generator</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="generator-body">
          {/* Prompt Preview Section */}
          <div className="prompt-preview-section">
            <div className="section-header">
              <h3>Enhanced Prompts Preview</h3>
              <button 
                className="toggle-btn"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'} Details
              </button>
            </div>
            
            {showPreview && (
              <div className="enhanced-prompts-list">
                {Object.entries(enhancedPrompts).map(([slideKey, prompts]) => {
                  const slideNumber = parseInt(slideKey.replace('slide_', ''));
                  const slide = pitchbook.slides?.find(s => s.slideNumber === slideNumber);
                  
                  return (
                    <div key={slideKey} className="enhanced-prompt-item">
                      <div className="prompt-slide-header">
                        <input
                          type="checkbox"
                          checked={selectedSlides.includes(slideKey)}
                          onChange={() => handleSlideToggle(slideKey)}
                          disabled={generating}
                        />
                        <span className="slide-label">
                          Slide {slideNumber}: {slide?.layoutName || 'Unknown'}
                        </span>
                      </div>
                      
                      {Object.entries(prompts).map(([placeholderKey, enhanced]) => (
                        <div key={placeholderKey} className="prompt-detail">
                          <div className="original-prompt">
                            <strong>Original:</strong> {enhanced.original}
                          </div>
                          <div className="enhanced-prompt">
                            <strong>Enhanced:</strong> {enhanced.enhanced.substring(0, 150)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generation Options */}
          <div className="generation-options">
            <h3>Generation Options</h3>
            <div className="options-grid">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={options.regenerate}
                  onChange={(e) => setOptions({...options, regenerate: e.target.checked})}
                  disabled={generating}
                />
                <span>Regenerate existing content</span>
              </label>
              
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={options.autoReview}
                  onChange={(e) => setOptions({...options, autoReview: e.target.checked})}
                  disabled={generating}
                />
                <span>Auto-review and improve</span>
              </label>
              
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={options.includeVariations}
                  onChange={(e) => setOptions({...options, includeVariations: e.target.checked})}
                  disabled={generating}
                />
                <span>Generate executive summary</span>
              </label>
            </div>
          </div>

          {/* Progress Section */}
          {generating && (
            <div className="progress-section">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{width: `${progress}%`}}
                />
              </div>
              <p className="progress-text">{currentTask}</p>
            </div>
          )}

          {/* Results Section */}
          {results && !generating && (
            <div className="results-section">
              <h3>Generation Results</h3>
              <div className="results-summary">
                <p className="success-message">
                  ✅ Successfully generated content for {Object.keys(results).length} slides
                </p>
                
                {results.executiveSummary && (
                  <div className="executive-summary">
                    <h4>Executive Summary</h4>
                    <p>{results.executiveSummary}</p>
                  </div>
                )}
                
                <div className="results-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setResults(null)}
                  >
                    Generate More
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={onClose}
                  >
                    Done
                  </button>
                </div>
              </div>
              
              {/* Individual Slide Results */}
              <div className="slide-results">
                {Object.entries(results).filter(([key]) => key !== 'executiveSummary').map(([slideKey, slideResults]) => (
                  <div key={slideKey} className="slide-result-item">
                    <div className="slide-result-header">
                      <span>{slideKey.replace('_', ' ').toUpperCase()}</span>
                      <button 
                        className="regenerate-btn"
                        onClick={() => handleRegenerateSlide(slideKey)}
                      >
                        🔄 Regenerate
                      </button>
                    </div>
                    
                    {Object.entries(slideResults).map(([placeholderKey, result]) => (
                      <div key={placeholderKey} className="placeholder-result">
                        {result.success ? (
                          <div className="content-preview">
                            {result.content.substring(0, 200)}...
                          </div>
                        ) : (
                          <div className="error-message">
                            ❌ Failed: {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="error-section">
              <p className="error-message">❌ {error}</p>
            </div>
          )}
        </div>

        <div className="generator-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={generating}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleGenerate}
            disabled={generating || selectedSlides.length === 0}
          >
            {generating ? 'Generating...' : 'Generate Content'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentGenerator;