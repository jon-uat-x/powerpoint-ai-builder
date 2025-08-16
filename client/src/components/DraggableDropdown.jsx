import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from './DraggableSlideThumbnail';
import './DraggableDropdown.css';

// Create SVG preview based on layout placeholders
const createLayoutSVG = (layout) => {
  const placeholders = layout.placeholders || [];
  const viewBoxWidth = 60;
  const viewBoxHeight = 45;
  
  return (
    <svg 
      width="40" 
      height="30" 
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className="dropdown-item-svg"
    >
      {/* Slide background */}
      <rect 
        x="0" 
        y="0" 
        width={viewBoxWidth} 
        height={viewBoxHeight}
        fill="#4a4d65"
        stroke="#6c7293"
        strokeWidth="1"
        rx="2"
      />
      
      {/* Placeholder outlines */}
      {placeholders.map((placeholder, index) => {
        // Scale coordinates from 1024x768 to 60x45
        const scaleX = viewBoxWidth / 1024;
        const scaleY = viewBoxHeight / 768;
        
        return (
          <rect
            key={index}
            x={placeholder.x * scaleX}
            y={placeholder.y * scaleY}
            width={placeholder.width * scaleX}
            height={placeholder.height * scaleY}
            fill="none"
            stroke="#9ca3c4"
            strokeWidth="0.5"
            strokeDasharray={placeholder.type === 'text' ? '2,1' : 'none'}
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
};

const DraggableDropdownItem = ({ layout, onClose }) => {
  const ref = useRef(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TEMPLATE,
    item: { type: ItemTypes.TEMPLATE, layout },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      // Close dropdown after dragging
      onClose();
    }
  });

  drag(ref);

  return (
    <div 
      ref={ref}
      className={`dropdown-item draggable ${isDragging ? 'dragging' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <span className="dropdown-item-icon">⋮⋮</span>
      <span className="dropdown-item-text">{layout.name}</span>
      {createLayoutSVG(layout)}
    </div>
  );
};

const DraggableDropdown = ({ layouts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="draggable-dropdown" ref={dropdownRef}>
      <button 
        className="dropdown-toggle"
        onClick={toggleDropdown}
      >
        <span className="dropdown-toggle-text">
          {selectedLayout ? selectedLayout.name : 'Add Slide'}
        </span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            Drag custom layout to add
          </div>
          <div className="dropdown-list">
            {layouts.map((layout, index) => (
              <DraggableDropdownItem
                key={index}
                layout={layout}
                onClose={handleClose}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableDropdown;