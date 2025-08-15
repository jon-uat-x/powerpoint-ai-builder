import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ collapsed = false, onToggle }) => {
  const [localCollapsed, setLocalCollapsed] = useState(collapsed);
  
  // Use prop if provided, otherwise use local state
  const isCollapsed = onToggle ? collapsed : localCollapsed;

  const menuItems = [
    {
      title: 'Dashboard',
      icon: '📊',
      path: '/'
    },
    {
      title: 'Pitchbooks',
      icon: '📚',
      path: '/pitchbooks'
    },
    {
      title: 'Create New',
      icon: '➕',
      path: '/create'
    },
    {
      title: 'Templates',
      icon: '📋',
      path: '/templates'
    }
  ];

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!isCollapsed);
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          {!isCollapsed && 'Pitchbook AI'}
        </h2>
        <button 
          className="sidebar-toggle"
          onClick={handleToggle}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={isCollapsed ? item.title : ''}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!isCollapsed && <span className="sidebar-text">{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="sidebar-footer-content">
            <p className="sidebar-footer-text">AI Pitchbook Builder</p>
            <p className="sidebar-footer-version">v1.0.0</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;