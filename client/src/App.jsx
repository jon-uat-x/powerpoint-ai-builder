import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PitchbookProvider } from './contexts/PitchbookContext';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import PitchbookList from './pages/PitchbookList';
import CreatePitchbook from './pages/CreatePitchbook';
import EditPitchbook from './pages/EditPitchbook';
import Templates from './pages/Templates';
import './styles/theme.css';
import './App.css';

function App() {
  return (
    <PitchbookProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="pitchbooks" element={<PitchbookList />} />
            <Route path="create" element={<CreatePitchbook />} />
            <Route path="pitchbook/:id/edit" element={<EditPitchbook />} />
            <Route path="templates" element={<Templates />} />
          </Route>
        </Routes>
      </Router>
    </PitchbookProvider>
  );
}

export default App
