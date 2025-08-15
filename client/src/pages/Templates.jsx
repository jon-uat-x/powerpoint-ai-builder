import React, { useEffect } from 'react';
import { usePitchbook } from '../contexts/PitchbookContext';

const Templates = () => {
  const { layouts, loadLayouts, loading } = usePitchbook();

  useEffect(() => {
    loadLayouts();
  }, []);

  return (
    <div className="templates-page">
      <div className="content-header">
        <h1 className="content-title">Slide Templates</h1>
        <p className="content-subtitle">
          Available slide layouts from OpenXML templates
        </p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="grid grid-cols-3">
          {layouts.map((layout, index) => (
            <div key={index} className="card">
              <div className="card-header">
                <h3 className="card-title">{layout.name}</h3>
              </div>
              {layout.thumbnail && (
                <img 
                  src={layout.thumbnail} 
                  alt={layout.name}
                  style={{ width: '100%', height: 'auto' }}
                />
              )}
              <div className="p-2">
                <p className="text-muted">
                  Placeholders: {layout.placeholders?.length || 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;