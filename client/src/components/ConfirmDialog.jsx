import React from 'react';
import { Modal, Box, Fade, Backdrop } from '@mui/material';
import './ConfirmDialog.css';

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => {
  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '400px',
    bgcolor: 'var(--bg-secondary)',
    boxShadow: 24,
    borderRadius: '8px',
    outline: 'none',
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
        sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)' }
      }}
    >
      <Fade in={open}>
        <Box sx={modalStyle}>
          <div className="confirm-dialog">
            <div className="confirm-dialog-header">
              <h3>{title || 'Confirm Action'}</h3>
            </div>
            <div className="confirm-dialog-body">
              <p>{message || 'Are you sure you want to proceed?'}</p>
            </div>
            <div className="confirm-dialog-footer">
              <button 
                onClick={onCancel} 
                className="btn btn-secondary"
              >
                No, Cancel
              </button>
              <button 
                onClick={onConfirm} 
                className="btn btn-danger"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </Box>
      </Fade>
    </Modal>
  );
};

export default ConfirmDialog;