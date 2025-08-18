import { GoogleGenerativeAI } from '@google/generative-ai';

// Direct implementation that mirrors the working test page
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('VITE_GEMINI_API_KEY is not set in environment variables');
}
const genAI = new GoogleGenerativeAI(API_KEY || '');

// Use Gemini Flash 2.5 model
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',  // Gemini Flash 2.5
  generationConfig: {
    temperature: 0.9,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  }
});

// Store chat sessions
const chatSessions = new Map();

export const geminiAPI = {
  // Start a new chat session
  async startChat(sessionId = 'default') {
    try {
      console.log('[geminiAPI] Starting chat session:', sessionId);
      const chat = model.startChat({
        history: [],
      });
      chatSessions.set(sessionId, chat);
      console.log('[geminiAPI] Chat session started successfully');
      return chat;
    } catch (error) {
      console.error('[geminiAPI] Error starting chat:', error);
      throw error;
    }
  },

  // Send a message in a chat session
  async sendMessage(message, sessionId = 'default') {
    try {
      console.log('[geminiAPI] Sending message:', message, 'Session:', sessionId);
      
      let chat = chatSessions.get(sessionId);
      
      if (!chat) {
        console.log('[geminiAPI] No existing chat, creating new one');
        chat = await this.startChat(sessionId);
      }

      console.log('[geminiAPI] Calling chat.sendMessage...');
      const result = await chat.sendMessage(message);
      console.log('[geminiAPI] Got result object:', result);
      
      const response = await result.response;
      console.log('[geminiAPI] Got response object:', response);
      
      const text = response.text();
      console.log('[geminiAPI] Extracted text:', text);
      
      return text;
    } catch (error) {
      console.error('[geminiAPI] Error in sendMessage:', {
        error,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  // Clear chat session
  clearChat(sessionId = 'default') {
    console.log('[geminiAPI] Clearing chat session:', sessionId);
    chatSessions.delete(sessionId);
  },

  // Direct content generation (for testing)
  async generateContent(prompt) {
    try {
      console.log('[geminiAPI] Direct generateContent:', prompt);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('[geminiAPI] Generated text:', text);
      return text;
    } catch (error) {
      console.error('[geminiAPI] Error in generateContent:', error);
      throw error;
    }
  },

  // Initialize method for compatibility
  async initialize() {
    console.log('[geminiAPI] Initialize called (no-op for direct version)');
    return true;
  },

  // Get status for compatibility
  getStatus() {
    return { initialized: true, model: 'gemini-2.5-flash' };
  }
};

// Test on load
console.log('[geminiAPI] Module loaded, testing connection...');
model.generateContent('test').then(
  () => console.log('[geminiAPI] ✅ Model is working'),
  (err) => console.error('[geminiAPI] ❌ Model test failed:', err.message)
);

export default geminiAPI;