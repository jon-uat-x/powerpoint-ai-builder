import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import StatusCard from './StatusCard';
import { usePitchbook } from '../contexts/PitchbookContext';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { error, success, clearError, clearSuccess } = usePitchbook();

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        {error && (
          <StatusCard 
            type="error" 
            message={error} 
            onClose={clearError}
          />
        )}
        {success && (
          <StatusCard 
            type="success" 
            message={success} 
            onClose={clearSuccess}
          />
        )}
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;