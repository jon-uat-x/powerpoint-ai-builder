import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from './DraggableSlideThumbnail';
import './DraggableTemplateItem.css';

const DraggableTemplateItem = ({ layout, onAddSlide }) => {
  const ref = useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TEMPLATE,
    item: { type: ItemTypes.TEMPLATE, layout },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(ref);

  return (
    <div 
      ref={ref}
      className={`add-slide-item draggable-template ${isDragging ? 'dragging' : ''}`}
      onClick={() => onAddSlide(layout.name)}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="add-slide-thumbnail">
        {layout.thumbnail ? (
          <img 
            src={layout.thumbnail} 
            alt={layout.name}
            className="add-slide-image"
            draggable={false}
          />
        ) : (
          <div className="add-slide-placeholder">
            <span>{layout.name}</span>
          </div>
        )}
      </div>
      <div className="add-slide-details">
        <div className="add-slide-name">{layout.name}</div>
        <div className="add-slide-meta">
          {layout.placeholders?.length || 0} placeholders
        </div>
      </div>
      <div className="drag-hint">Drag to add</div>
    </div>
  );
};

export default DraggableTemplateItem;