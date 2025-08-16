import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  IconButton,
  Snackbar,
  Alert,
  Box,
  Typography
} from '@mui/material';
import './JsonViewerDialog.css';

const JsonViewerDialog = ({ open, onClose, pitchbook }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      const jsonText = JSON.stringify(pitchbook, null, 2);
      await navigator.clipboard.writeText(jsonText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setCopySuccess(false);
    onClose();
  };

  if (!pitchbook) return null;

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--bg-card)',
            backgroundImage: 'none',
            border: '1px solid var(--border-color)',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: 'var(--text-primary)', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box>
            <Typography variant="h6" component="div">
              Prompts Text - {pitchbook.title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
              Raw JSON data for all prompts and configuration
            </Typography>
          </Box>
          <IconButton
            onClick={handleCopy}
            title="Copy to clipboard"
            sx={{
              color: copySuccess ? 'var(--success-color)' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: copySuccess ? 'var(--success-color)' : 'var(--border-color)',
              borderRadius: '4px',
              padding: '8px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'var(--primary-color)',
                color: 'var(--primary-color)'
              }
            }}
          >
            {copySuccess ? (
              <span style={{ fontSize: '20px' }}>✓</span>
            ) : (
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2, p: 0 }}>
          <Box className="json-viewer-container">
            <pre className="json-viewer-content">
              {JSON.stringify(pitchbook, null, 2)}
            </pre>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ borderTop: '1px solid var(--border-color)', p: 2 }}>
          <Button 
            onClick={handleCopy}
            variant="outlined"
            sx={{ 
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)',
              '&:hover': {
                borderColor: 'var(--primary-color)',
                backgroundColor: 'rgba(229, 81, 0, 0.1)'
              }
            }}
          >
            {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          <Button 
            onClick={handleClose}
            variant="contained"
            sx={{
              bgcolor: 'var(--primary-color)',
              color: 'white',
              '&:hover': {
                bgcolor: 'var(--primary-hover)',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          sx={{ 
            bgcolor: 'var(--success-color)',
            color: 'var(--bg-primary)'
          }}
        >
          JSON copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};

export default JsonViewerDialog;