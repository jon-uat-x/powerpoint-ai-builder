import React, { useState } from 'react';
import DraggableTemplateItem from './DraggableTemplateItem';
import DraggableDropdown from './DraggableDropdown';
import './RightSidebar.css';

const RightSidebar = ({ layouts, onAddSlide, onToggle }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    if (onToggle) {
      onToggle(newCollapsed);
    }
  };

  return (
    <div className={`right-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="right-sidebar-header">
        <h2 className="right-sidebar-title">
          {!collapsed && 'Available Designs'}
        </h2>
        <button 
          className="right-sidebar-toggle"
          onClick={handleToggle}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '◀' : '▶'}
        </button>
      </div>

      {!collapsed && (
        <div className="right-sidebar-content">
          <DraggableDropdown layouts={layouts} />
          <div className="template-section-divider">
            <span className="divider-text">Or browse templates</span>
          </div>
          <div className="add-slides-list">
            {layouts.map((layout, index) => (
              <DraggableTemplateItem
                key={index}
                layout={layout}
                onAddSlide={onAddSlide}
              />
            ))}
          </div>
        </div>
      )}

      {collapsed && (
        <div className="right-sidebar-collapsed-content">
          <div className="collapsed-text">Slides</div>
        </div>
      )}
    </div>
  );
};

export default RightSidebar;