import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from './DraggableSlideThumbnail';
import './DropZone.css';

const DropZone = ({ onDrop, position, label = "Drop here to add slide" }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.SLIDE, ItemTypes.TEMPLATE],
    drop: (item) => {
      if (item.type === ItemTypes.TEMPLATE) {
        onDrop(item.layout, position);
      } else if (item.type === ItemTypes.SLIDE) {
        // Handle slide reordering to end position
        onDrop(item.slide, position);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;

  return (
    <div 
      ref={drop} 
      className={`drop-zone ${isActive ? 'active' : ''} ${canDrop ? 'can-drop' : ''}`}
    >
      {isActive && (
        <div className="drop-zone-content">
          <div className="drop-zone-icon">+</div>
          <div className="drop-zone-label">{label}</div>
        </div>
      )}
    </div>
  );
};

export default DropZone;