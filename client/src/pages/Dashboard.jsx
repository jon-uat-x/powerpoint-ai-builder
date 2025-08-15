import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePitchbook } from '../contexts/PitchbookContext';
import './Dashboard.css';

const Dashboard = () => {
  const { pitchbooks, loadPitchbooks, loading } = usePitchbook();

  useEffect(() => {
    loadPitchbooks();
  }, []);

  const recentPitchbooks = pitchbooks.slice(0, 5);

  return (
    <div className="dashboard-page">
      <div className="content-header">
        <h1 className="content-title">Dashboard</h1>
        <p className="content-subtitle">Welcome to AI Pitchbook Builder</p>
      </div>

      <div className="dashboard-grid">
        <div className="card stats-card">
          <div className="card-header">
            <h3 className="card-title">Quick Stats</h3>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{pitchbooks.length}</span>
              <span className="stat-label">Total Pitchbooks</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {pitchbooks.filter(p => p.status === 'generated').length}
              </span>
              <span className="stat-label">Generated</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {pitchbooks.filter(p => !p.status || p.status === 'draft').length}
              </span>
              <span className="stat-label">In Progress</span>
            </div>
          </div>
        </div>

        <div className="card action-card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="action-buttons">
            <Link to="/create" className="btn btn-primary btn-lg">
              Create New Pitchbook
            </Link>
            <Link to="/pitchbooks" className="btn btn-secondary">
              View All Pitchbooks
            </Link>
            <Link to="/templates" className="btn btn-secondary">
              Browse Templates
            </Link>
          </div>
        </div>

        <div className="card recent-card">
          <div className="card-header">
            <h3 className="card-title">Recent Pitchbooks</h3>
          </div>
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
            </div>
          ) : recentPitchbooks.length > 0 ? (
            <div className="recent-list">
              {recentPitchbooks.map(pitchbook => (
                <Link
                  key={pitchbook.id}
                  to={`/pitchbook/${pitchbook.id}/edit`}
                  className="recent-item"
                >
                  <div className="recent-info">
                    <span className="recent-title">{pitchbook.title}</span>
                    <span className="recent-date">
                      {new Date(pitchbook.updated || pitchbook.created).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`recent-status ${pitchbook.status || 'draft'}`}>
                    {pitchbook.status || 'Draft'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No pitchbooks yet</p>
              <Link to="/create" className="btn btn-primary btn-sm">
                Create Your First Pitchbook
              </Link>
            </div>
          )}
        </div>

        <div className="card info-card">
          <div className="card-header">
            <h3 className="card-title">Getting Started</h3>
          </div>
          <ol className="info-list">
            <li>Create a new pitchbook with title and sections</li>
            <li>Click on slide placeholders to add AI prompts</li>
            <li>Generate content with AI</li>
            <li>Export to PowerPoint (coming soon)</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;