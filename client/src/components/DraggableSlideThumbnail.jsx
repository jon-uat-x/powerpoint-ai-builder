import React, { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import SlideThumbnail from './SlideThumbnail';
import './DraggableSlideThumbnail.css';

const ItemTypes = {
  SLIDE: 'slide',
  TEMPLATE: 'template'
};

const DraggableSlideThumbnail = ({ 
  slide, 
  index, 
  moveSlide, 
  insertSlide,
  onPlaceholderClick,
  onSlidePromptClick,
  onDelete
}) => {
  const ref = useRef(null);
  const [showDropIndicator, setShowDropIndicator] = useState(false);
  const [dropPosition, setDropPosition] = useState(null);

  // Drag functionality
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SLIDE,
    item: { type: ItemTypes.SLIDE, index, slide, originalIndex: index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      setShowDropIndicator(false);
      setDropPosition(null);
    },
  });

  // Drop functionality for reordering and inserting
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.SLIDE, ItemTypes.TEMPLATE],
    hover: (item, monitor) => {
      if (!ref.current) return;
      if (!monitor.isOver({ shallow: true })) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Determine drop position (before or after)
      const dropBefore = hoverClientY < hoverMiddleY;
      
      if (item.type === ItemTypes.SLIDE) {
        const dragIndex = item.originalIndex;
        const hoverIndex = index;
        
        if (dragIndex !== hoverIndex) {
          setShowDropIndicator(true);
          setDropPosition(dropBefore ? 'before' : 'after');
        } else {
          setShowDropIndicator(false);
        }
      } else if (item.type === ItemTypes.TEMPLATE) {
        setShowDropIndicator(true);
        setDropPosition(dropBefore ? 'before' : 'after');
      }
    },
    drop: (item, monitor) => {
      setShowDropIndicator(false);
      
      if (item.type === ItemTypes.TEMPLATE) {
        // Insert new slide from template
        const insertPosition = dropPosition === 'before' ? index : index + 1;
        insertSlide(item.layout, insertPosition);
      } else if (item.type === ItemTypes.SLIDE) {
        // Move existing slide to new position
        const dragIndex = item.originalIndex;
        
        if (dragIndex !== index) {
          let targetIndex = index;
          
          // If dropping after and dragging from before, don't adjust
          // If dropping before and dragging from after, adjust by 1
          if (dropPosition === 'after') {
            targetIndex = dragIndex < index ? index : index + 1;
          } else {
            targetIndex = dragIndex > index ? index : index;
          }
          
          moveSlide(dragIndex, targetIndex);
        }
      }
      setDropPosition(null);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });
  
  // Clear indicator when not hovering
  React.useEffect(() => {
    if (!isOver) {
      setShowDropIndicator(false);
      setDropPosition(null);
    }
  }, [isOver]);

  // Connect drag and drop refs
  drag(drop(ref));

  return (
    <div className="draggable-slide-wrapper">
      {showDropIndicator && dropPosition === 'before' && (
        <div className="drop-indicator-line before" />
      )}
      <div
        ref={ref}
        className={`draggable-slide-thumbnail ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <SlideThumbnail
          slide={slide}
          onPlaceholderClick={onPlaceholderClick}
          onSlidePromptClick={onSlidePromptClick}
          onDelete={onDelete}
          showDelete={true}
        />
      </div>
      {showDropIndicator && dropPosition === 'after' && (
        <div className="drop-indicator-line after" />
      )}
    </div>
  );
};

export default DraggableSlideThumbnail;
export { ItemTypes };