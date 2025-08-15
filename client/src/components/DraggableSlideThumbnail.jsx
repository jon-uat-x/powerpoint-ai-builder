import React, { useRef } from 'react';
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
  onDelete
}) => {
  const ref = useRef(null);

  // Drag functionality
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SLIDE,
    item: { type: ItemTypes.SLIDE, index, slide },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drop functionality for reordering and inserting
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.SLIDE, ItemTypes.TEMPLATE],
    hover: (item, monitor) => {
      if (!ref.current) return;

      if (item.type === ItemTypes.SLIDE) {
        const dragIndex = item.index;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) return;

        const hoverBoundingRect = ref.current?.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        // Only perform the move when the mouse has crossed half of the item's height
        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

        moveSlide(dragIndex, hoverIndex);
        item.index = hoverIndex;
      }
    },
    drop: (item, monitor) => {
      if (item.type === ItemTypes.TEMPLATE) {
        // Insert new slide from template
        const dropPosition = index;
        insertSlide(item.layout, dropPosition);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  // Connect drag and drop refs
  drag(drop(ref));

  return (
    <div className="draggable-slide-wrapper">
      <div
        ref={ref}
        className={`draggable-slide-thumbnail ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <SlideThumbnail
          slide={slide}
          onPlaceholderClick={onPlaceholderClick}
          onDelete={onDelete}
          showDelete={true}
        />
      </div>
      {isOver && canDrop && (
        <div className="drop-indicator">Drop here to insert</div>
      )}
    </div>
  );
};

export default DraggableSlideThumbnail;
export { ItemTypes };