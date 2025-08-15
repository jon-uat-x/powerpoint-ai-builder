import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePitchbook } from '../contexts/PitchbookContext';

const PitchbookList = () => {
  const { pitchbooks, loadPitchbooks, loading } = usePitchbook();

  useEffect(() => {
    loadPitchbooks();
  }, []);

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
              <div className="flex gap-2 mt-3">
                <Link
                  to={`/pitchbook/${pitchbook.id}/edit`}
                  className="btn btn-primary btn-sm"
                >
                  Edit
                </Link>
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
    </div>
  );
};

export default PitchbookList;