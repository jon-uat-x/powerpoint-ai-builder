import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DndProvider from '../components/DndProvider';
import SlideGrid from '../components/SlideGrid';
import PromptEditor from '../components/PromptEditor';
import RightSidebar from '../components/RightSidebar';
import { usePitchbook } from '../contexts/PitchbookContext';
import './EditPitchbook.css';

const EditPitchbook = () => {
  const { id } = useParams();
  const { currentPitchbook, generateContent, loading, loadPitchbook, layouts } = usePitchbook();
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
  const [selectedPlaceholderInfo, setSelectedPlaceholderInfo] = useState(null);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

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

  const handleAddSlide = (layoutName) => {
    console.log('Adding slide with layout:', layoutName);
    // TODO: Implement slide addition logic
  };

  return (
    <DndProvider>
      <>
        <div className={`edit-pitchbook-page ${rightSidebarCollapsed ? 'right-sidebar-collapsed' : ''}`}>
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

          <div className="edit-pitchbook-content">
            <SlideGrid 
              pitchbookId={id} 
              onPromptEdit={handlePromptEdit}
            />
          </div>

          <PromptEditor
            open={promptEditorOpen}
            onClose={handlePromptClose}
            slideNumber={selectedSlide}
            placeholderId={selectedPlaceholder}
            placeholderInfo={selectedPlaceholderInfo}
          />
        </div>

        <RightSidebar 
          layouts={layouts}
          onAddSlide={handleAddSlide}
          onToggle={(collapsed) => setRightSidebarCollapsed(collapsed)}
        />
      </>
    </DndProvider>
  );
};

export default EditPitchbook;