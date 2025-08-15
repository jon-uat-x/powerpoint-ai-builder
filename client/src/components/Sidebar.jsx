import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          {!collapsed && 'Pitchbook AI'}
        </h2>
        <button 
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '→' : '←'}
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
            title={collapsed ? item.title : ''}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-text">{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
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