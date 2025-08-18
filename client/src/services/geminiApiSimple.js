import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API with environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY is not set in environment variables');
}
const genAI = new GoogleGenerativeAI(apiKey || '');

// Initialize Gemini Flash 2.5 model
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',  // Using Gemini Flash 2.5
  generationConfig: {
    temperature: 0.9,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  ],
});

// Store chat sessions
const chatSessions = new Map();

export const geminiAPI = {
  // Start a new chat session
  async startChat(sessionId = 'default') {
    try {
      console.log('[geminiApiSimple] Starting chat with sessionId:', sessionId);
      const chat = model.startChat({
        history: [],
      });
      console.log('[geminiApiSimple] Chat object created:', chat);
      chatSessions.set(sessionId, chat);
      console.log('[geminiApiSimple] Chat session stored');
      return chat;
    } catch (error) {
      console.error('[geminiApiSimple] Error starting chat:', error);
      throw error;
    }
  },

  // Send a message in a chat session
  async sendMessage(message, sessionId = 'default') {
    try {
      console.log('[geminiApiSimple] === SEND MESSAGE START ===');
      console.log('[geminiApiSimple] Message:', message);
      console.log('[geminiApiSimple] SessionId:', sessionId);
      
      let chat = chatSessions.get(sessionId);
      console.log('[geminiApiSimple] Existing chat?', !!chat);
      
      if (!chat) {
        console.log('[geminiApiSimple] Creating new chat session...');
        chat = await this.startChat(sessionId);
        console.log('[geminiApiSimple] New chat created');
      }

      console.log('[geminiApiSimple] Calling chat.sendMessage()...');
      const result = await chat.sendMessage(message);
      console.log('[geminiApiSimple] Result object:', result);
      
      console.log('[geminiApiSimple] Getting response...');
      const response = await result.response;
      console.log('[geminiApiSimple] Response object:', response);
      
      console.log('[geminiApiSimple] Extracting text...');
      const text = response.text();
      console.log('[geminiApiSimple] Extracted text:', text);
      console.log('[geminiApiSimple] Text type:', typeof text);
      console.log('[geminiApiSimple] Text length:', text?.length);
      
      console.log('[geminiApiSimple] === SEND MESSAGE SUCCESS ===');
      return text;
    } catch (error) {
      console.error('[geminiApiSimple] === SEND MESSAGE ERROR ===');
      console.error('[geminiApiSimple] Full error:', error);
      console.error('[geminiApiSimple] Error message:', error.message);
      console.error('[geminiApiSimple] Error stack:', error.stack);
      console.error('[geminiApiSimple] Error details:', error.response || error.details);
      
      // More specific error handling
      if (error.message?.includes('API_KEY')) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      }
      if (error.message?.includes('models/gemini')) {
        throw new Error('Model not available. The Gemini 2.5 Flash model may not be accessible with your API key.');
      }
      if (error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please check your Google Cloud quotas.');
      }
      
      throw error;
    }
  },

  // Get chat history
  async getChatHistory(sessionId = 'default') {
    const chat = chatSessions.get(sessionId);
    if (!chat) {
      return [];
    }
    return chat._history || [];
  },

  // Clear chat session
  clearChat(sessionId = 'default') {
    chatSessions.delete(sessionId);
  },

  // Generate content without chat context (direct generation)
  async generateContent(prompt) {
    try {
      console.log('[geminiApiSimple] === GENERATE CONTENT START ===');
      console.log('[geminiApiSimple] Prompt:', prompt);
      console.log('[geminiApiSimple] Model object:', model);
      
      console.log('[geminiApiSimple] Calling model.generateContent...');
      const result = await model.generateContent(prompt);
      console.log('[geminiApiSimple] Result object:', result);
      
      console.log('[geminiApiSimple] Getting response...');
      const response = await result.response;
      console.log('[geminiApiSimple] Response object:', response);
      
      console.log('[geminiApiSimple] Extracting text...');
      const text = response.text();
      console.log('[geminiApiSimple] Extracted text:', text);
      console.log('[geminiApiSimple] Text type:', typeof text);
      console.log('[geminiApiSimple] Text length:', text?.length);
      
      console.log('[geminiApiSimple] === GENERATE CONTENT SUCCESS ===');
      return text;
    } catch (error) {
      console.error('[geminiApiSimple] === GENERATE CONTENT ERROR ===');
      console.error('[geminiApiSimple] Error:', error);
      console.error('[geminiApiSimple] Error message:', error.message);
      console.error('[geminiApiSimple] Error stack:', error.stack);
      
      if (error.message?.includes('API_KEY')) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      }
      if (error.message?.includes('models/gemini')) {
        throw new Error('Model not available. The Gemini 2.5 Flash model may not be accessible with your API key.');
      }
      
      throw error;
    }
  },

  // Stream content generation
  async generateContentStream(prompt, onChunk) {
    try {
      const result = await model.generateContentStream(prompt);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        onChunk(chunkText);
      }
      
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in content stream:', error);
      throw error;
    }
  }
};

export default geminiAPI;