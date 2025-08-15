import React, { useEffect } from 'react';
import './StatusCard.css';

const StatusCard = ({ type = 'info', message, onClose, autoClose = 5000 }) => {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`status-card ${type}`}>
      <span className="status-icon">{getIcon()}</span>
      <span className="status-message">{message}</span>
      {onClose && (
        <button className="status-close" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  );
};

export default StatusCard;