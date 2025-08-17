import React, { useState, useEffect, useRef } from 'react';
import { geminiAPI } from '../services/geminiApiSimple';  // Using geminiApiSimple with gemini-2.5-flash
import './AIChatbot.css';

const AIChatbot = ({ open, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = useRef(`chat_${Date.now()}`);

  useEffect(() => {
    if (open) {
      // Initialize chat session when dialog opens
      initializeChat();
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      console.log('[AIChatbot] Initializing chat...');
      
      // Simple initialization
      await geminiAPI.startChat(sessionId.current);
      
      // Add welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant powered by Gemini. How can I help you today?',
        timestamp: new Date().toISOString()
      }]);
      setError(null);
      console.log('[AIChatbot] Chat initialized successfully');
    } catch (err) {
      const errorMsg = err.message || 'Failed to initialize chat';
      setError(errorMsg);
      console.error('[AIChatbot] Chat initialization error:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    console.log('[AIChatbot] === HANDLE SEND START ===');
    console.log('[AIChatbot] Input value:', inputValue);
    console.log('[AIChatbot] Session ID:', sessionId.current);

    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };
    console.log('[AIChatbot] User message object:', userMessage);

    console.log('[AIChatbot] Adding user message to state...');
    setMessages(prev => {
      console.log('[AIChatbot] Previous messages count:', prev.length);
      const newMessages = [...prev, userMessage];
      console.log('[AIChatbot] New messages count:', newMessages.length);
      return newMessages;
    });
    
    const messageToSend = inputValue; // Store before clearing
    console.log('[AIChatbot] Message to send:', messageToSend);
    
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('[AIChatbot] Calling geminiAPI.sendMessage...');
      const response = await geminiAPI.sendMessage(messageToSend, sessionId.current);
      console.log('[AIChatbot] Response received:', response);
      console.log('[AIChatbot] Response type:', typeof response);
      console.log('[AIChatbot] Response length:', response?.length);
      
      if (!response) {
        console.error('[AIChatbot] WARNING: Response is null/undefined!');
      }
      
      const assistantMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response || 'No response received',
        timestamp: new Date().toISOString()
      };
      console.log('[AIChatbot] Assistant message object:', assistantMessage);

      console.log('[AIChatbot] Adding assistant message to state...');
      setMessages(prev => {
        console.log('[AIChatbot] Previous messages before assistant:', prev.length);
        const newMessages = [...prev, assistantMessage];
        console.log('[AIChatbot] New messages after assistant:', newMessages.length);
        console.log('[AIChatbot] All messages:', newMessages);
        return newMessages;
      });
      
      console.log('[AIChatbot] === HANDLE SEND SUCCESS ===');
    } catch (err) {
      console.error('[AIChatbot] === HANDLE SEND ERROR ===');
      const errorMessage = err.message || 'Failed to get response. Please try again.';
      setError(errorMessage);
      console.error('[AIChatbot] Full error details:', {
        error: err,
        message: err.message,
        stack: err.stack
      });
    } finally {
      console.log('[AIChatbot] === HANDLE SEND FINALLY ===');
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([{
      id: 'welcome_new',
      role: 'assistant',
      content: 'Chat cleared. How can I help you?',
      timestamp: new Date().toISOString()
    }]);
    geminiAPI.clearChat(sessionId.current);
    sessionId.current = `chat_${Date.now()}`;
    geminiAPI.startChat(sessionId.current);
  };

  const handleTestConnection = async () => {
    console.log('[AIChatbot] === TEST CONNECTION START ===');
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[AIChatbot] Testing with generateContent (no chat session)...');
      const response = await geminiAPI.generateContent('Say "Hello! Connection successful!" if you can hear me.');
      console.log('[AIChatbot] Test response:', response);
      console.log('[AIChatbot] Test response type:', typeof response);
      console.log('[AIChatbot] Test response length:', response?.length);
      
      const testMessage = {
        id: `test_${Date.now()}`,
        role: 'assistant',
        content: `✅ Connection Test Successful!\nResponse: ${response}`,
        timestamp: new Date().toISOString()
      };
      console.log('[AIChatbot] Test message object:', testMessage);
      
      console.log('[AIChatbot] Adding test message to state...');
      setMessages(prev => {
        console.log('[AIChatbot] Messages before test:', prev);
        const newMessages = [...prev, testMessage];
        console.log('[AIChatbot] Messages after test:', newMessages);
        return newMessages;
      });
      console.log('[AIChatbot] === TEST CONNECTION SUCCESS ===');
    } catch (err) {
      console.error('[AIChatbot] === TEST CONNECTION ERROR ===');
      const errorMsg = `Connection test failed: ${err.message}`;
      setError(errorMsg);
      console.error('[AIChatbot] Connection test error:', err);
    } finally {
      console.log('[AIChatbot] === TEST CONNECTION FINALLY ===');
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!open) return null;

  return (
    <div className="chatbot-overlay" onClick={onClose}>
      <div className="chatbot-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <svg className="chatbot-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
              <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
              <path d="M12 17c2.21 0 4-1.79 4-4h-8c0 2.21 1.79 4 4 4z" fill="currentColor"/>
            </svg>
            <h2>AI Assistant</h2>
            <span className="chatbot-badge">Powered by Gemini</span>
          </div>
          <div className="chatbot-header-actions">
            <button 
              className="chatbot-clear-btn" 
              onClick={handleTestConnection}
              title="Test connection"
              disabled={isLoading}
            >
              🔌
            </button>
            <button 
              className="chatbot-clear-btn" 
              onClick={handleClearChat}
              title="Clear chat"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
              </svg>
            </button>
            <button 
              className="chatbot-close-btn" 
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div 
              key={message.id} 
              className={`chatbot-message ${message.role}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? 'U' : 'AI'}
              </div>
              <div className="message-content-wrapper">
                <div className="message-content">
                  {message.content}
                </div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="chatbot-message assistant">
              <div className="message-avatar">AI</div>
              <div className="message-content-wrapper">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="chatbot-error">
              {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-input-container">
          <textarea
            ref={inputRef}
            className="chatbot-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here... (Press Enter to send)"
            disabled={isLoading}
            rows="2"
          />
          <button 
            className="chatbot-send-btn" 
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;