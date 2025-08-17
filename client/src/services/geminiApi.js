import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI('AIzaSyAIaoyackjLgToGh_okfAoyjuqkwyl1KF0');

// Model configuration
const modelConfig = {
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
};

// Try multiple model names to find one that works
let model = null;
const modelNames = [
  'gemini-2.5-flash',  // Gemini Flash 2.5
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest'
];

// Initialize model with fallback
async function initializeModel() {
  for (const modelName of modelNames) {
    try {
      console.log(`Attempting to initialize model: ${modelName}`);
      const testModel = genAI.getGenerativeModel({ 
        model: modelName,
        ...modelConfig
      });
      
      // Test the model with a simple request
      const result = await testModel.generateContent('Hi');
      await result.response;
      
      model = testModel;
      console.log(`Successfully initialized model: ${modelName}`);
      return modelName;
    } catch (err) {
      console.log(`Model ${modelName} failed:`, err.message);
    }
  }
  
  // If no model works, use the first one as fallback
  model = genAI.getGenerativeModel({ 
    model: modelNames[0],
    ...modelConfig
  });
  
  throw new Error('Could not initialize any Gemini model. Please check your API key.');
}

// Initialize on first use
let modelInitialized = false;
let modelInitPromise = null;

async function ensureModelInitialized() {
  if (!modelInitialized && !modelInitPromise) {
    modelInitPromise = initializeModel();
    try {
      await modelInitPromise;
      modelInitialized = true;
    } catch (err) {
      modelInitPromise = null;
      throw err;
    }
  } else if (modelInitPromise) {
    await modelInitPromise;
  }
}

// Store chat sessions
const chatSessions = new Map();

export const geminiAPI = {
  // Start a new chat session
  async startChat(sessionId = 'default') {
    try {
      await ensureModelInitialized();
      const chat = model.startChat({
        history: [],
      });
      chatSessions.set(sessionId, chat);
      return chat;
    } catch (error) {
      console.error('Error starting chat:', error);
      throw error;
    }
  },

  // Send a message in a chat session
  async sendMessage(message, sessionId = 'default') {
    try {
      console.log('Sending message to Gemini:', message);
      await ensureModelInitialized();
      
      let chat = chatSessions.get(sessionId);
      
      if (!chat) {
        console.log('Starting new chat session');
        chat = await this.startChat(sessionId);
      }

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      console.log('Received response from Gemini:', text);
      return text;
    } catch (error) {
      console.error('Detailed error sending message:', {
        error,
        message: error.message,
        stack: error.stack,
        details: error.response || error.details
      });
      
      // Check for specific error types
      if (error.message?.includes('API key')) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      }
      if (error.message?.includes('model')) {
        throw new Error('Model not available. Please check the model name.');
      }
      if (error.message?.includes('Could not initialize')) {
        throw new Error(error.message);
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

  // Generate content without chat context
  async generateContent(prompt) {
    try {
      await ensureModelInitialized();
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  },

  // Stream content generation
  async generateContentStream(prompt, onChunk) {
    try {
      await ensureModelInitialized();
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