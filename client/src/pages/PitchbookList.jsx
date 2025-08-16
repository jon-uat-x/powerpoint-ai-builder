import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePitchbook } from '../contexts/PitchbookContext';
import JsonViewerDialog from '../components/JsonViewerDialog';
import './PitchbookList.css';

const PitchbookList = () => {
  const { pitchbooks, loadPitchbooks, loading } = usePitchbook();
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [selectedPitchbook, setSelectedPitchbook] = useState(null);

  useEffect(() => {
    loadPitchbooks();
  }, []);

  const handlePromptsTextClick = (pitchbook) => {
    setSelectedPitchbook(pitchbook);
    setJsonDialogOpen(true);
  };

  const handleJsonDialogClose = () => {
    setJsonDialogOpen(false);
    setSelectedPitchbook(null);
  };

  return (
    <div className="pitchbook-list-page">
      <div className="content-header">
        <h1 className="content-title">My Pitchbooks</h1>
        <Link to="/create" className="btn btn-primary">
          Create New
        </Link>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : pitchbooks.length > 0 ? (
        <div className="grid grid-cols-3">
          {pitchbooks.map(pitchbook => (
            <div key={pitchbook.id} className="card">
              <h3 className="card-title">{pitchbook.title}</h3>
              <p className="text-muted">
                Created: {new Date(pitchbook.created).toLocaleDateString()}
              </p>
              <p className="text-muted">
                Slides: {pitchbook.slides?.length || 0}
              </p>
              <div className="card-actions">
                <Link
                  to={`/pitchbook/${pitchbook.id}/edit`}
                  className="btn btn-primary btn-sm"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handlePromptsTextClick(pitchbook)}
                  className="btn btn-secondary btn-sm prompts-text-btn"
                >
                  Prompts Text
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No pitchbooks yet</p>
          <Link to="/create" className="btn btn-primary">
            Create Your First Pitchbook
          </Link>
        </div>
      )}

      <JsonViewerDialog
        open={jsonDialogOpen}
        onClose={handleJsonDialogClose}
        pitchbook={selectedPitchbook}
      />
    </div>
  );
};

export default PitchbookList;