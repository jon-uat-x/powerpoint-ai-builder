import React, { useEffect } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
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
        return <CheckCircleIcon sx={{ fontSize: 20 }} />;
      case 'error':
        return <CancelIcon sx={{ fontSize: 20 }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 20 }} />;
      case 'info':
      default:
        return <InfoIcon sx={{ fontSize: 20 }} />;
    }
  };

  return (
    <div className={`status-card ${type}`}>
      <span className="status-icon">{getIcon()}</span>
      <span className="status-message">{message}</span>
      {onClose && (
        <button className="status-close" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </button>
      )}
    </div>
  );
};

export default StatusCard;