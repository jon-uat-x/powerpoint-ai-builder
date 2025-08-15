import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SlideGrid from '../components/SlideGrid';
import PromptEditor from '../components/PromptEditor';
import { usePitchbook } from '../contexts/PitchbookContext';

const EditPitchbook = () => {
  const { id } = useParams();
  const { currentPitchbook, generateContent, loading, loadPitchbook } = usePitchbook();
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
  const [selectedPlaceholderInfo, setSelectedPlaceholderInfo] = useState(null);

  useEffect(() => {
    if (id) {
      loadPitchbook(id);
    }
  }, [id]);

  const handlePromptEdit = (slideNumber, placeholderId, placeholderInfo) => {
    console.log('Editing prompt for slide', slideNumber, 'placeholder', placeholderId);
    setSelectedSlide(slideNumber);
    setSelectedPlaceholder(placeholderId);
    setSelectedPlaceholderInfo(placeholderInfo);
    setPromptEditorOpen(true);
  };

  const handlePromptClose = () => {
    setPromptEditorOpen(false);
    setSelectedSlide(null);
    setSelectedPlaceholder(null);
    setSelectedPlaceholderInfo(null);
  };

  const handleGenerate = async () => {
    if (currentPitchbook) {
      await generateContent();
    }
  };

  return (
    <div className="edit-pitchbook-page">
      <div className="content-header">
        <div>
          <h1 className="content-title">
            {currentPitchbook?.title || 'Edit Pitchbook'}
          </h1>
          <p className="content-subtitle">
            Add prompts to placeholders and generate content
          </p>
        </div>
        <button
          onClick={handleGenerate}
          className="btn btn-success"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Content'}
        </button>
      </div>

      <SlideGrid 
        pitchbookId={id} 
        onPromptEdit={handlePromptEdit}
      />

      <PromptEditor
        open={promptEditorOpen}
        onClose={handlePromptClose}
        slideNumber={selectedSlide}
        placeholderId={selectedPlaceholder}
        placeholderInfo={selectedPlaceholderInfo}
      />
    </div>
  );
};

export default EditPitchbook;