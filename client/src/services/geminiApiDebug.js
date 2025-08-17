import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API with your API key
const API_KEY = 'AIzaSyAIaoyackjLgToGh_okfAoyjuqkwyl1KF0';
console.log('Initializing Gemini API with key:', API_KEY.substring(0, 15) + '...');

const genAI = new GoogleGenerativeAI(API_KEY);

// Test function to verify API connection
export async function testConnection() {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'];
  
  for (const modelName of models) {
    try {
      console.log(`Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      const text = response.text();
      console.log(`✅ Model ${modelName} works! Response:`, text);
      return { success: true, model: modelName, response: text };
    } catch (error) {
      console.log(`❌ Model ${modelName} failed:`, error.message);
      
      // Check for API key issues
      if (error.message?.toLowerCase().includes('api key')) {
        console.error('API KEY PROBLEM DETECTED!');
        console.error('Error details:', error);
        return { 
          success: false, 
          error: 'API_KEY_INVALID',
          message: 'The API key appears to be invalid. Please check:\n1. The key is correct\n2. The Gemini API is enabled in Google Cloud Console\n3. The key has not been revoked'
        };
      }
      
      // Check for quota issues
      if (error.message?.toLowerCase().includes('quota')) {
        return { 
          success: false, 
          error: 'QUOTA_EXCEEDED',
          message: 'API quota exceeded. Please check your Google Cloud quotas.'
        };
      }
    }
  }
  
  return { 
    success: false, 
    error: 'NO_WORKING_MODEL',
    message: 'Could not find a working model. This might be a temporary issue or the API key might not have access to these models.'
  };
}

// Initialize with the first working model
let workingModel = null;
let initializationError = null;

async function initializeWorkingModel() {
  const testResult = await testConnection();
  
  if (testResult.success) {
    console.log(`Using model: ${testResult.model}`);
    workingModel = genAI.getGenerativeModel({ 
      model: testResult.model,
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    return workingModel;
  } else {
    initializationError = testResult;
    throw new Error(testResult.message);
  }
}

// Store chat sessions
const chatSessions = new Map();

export const geminiAPI = {
  // Initialize and test connection
  async initialize() {
    if (!workingModel && !initializationError) {
      await initializeWorkingModel();
    }
    if (initializationError) {
      throw new Error(initializationError.message);
    }
    return true;
  },

  // Get initialization status
  getStatus() {
    if (workingModel) {
      return { initialized: true, model: workingModel._modelName };
    }
    if (initializationError) {
      return { initialized: false, error: initializationError };
    }
    return { initialized: false, error: 'Not initialized' };
  },

  // Start a new chat session
  async startChat(sessionId = 'default') {
    try {
      if (!workingModel) {
        await this.initialize();
      }
      
      const chat = workingModel.startChat({
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
      console.log('Sending message:', message);
      
      if (!workingModel) {
        await this.initialize();
      }
      
      let chat = chatSessions.get(sessionId);
      
      if (!chat) {
        console.log('Creating new chat session');
        chat = await this.startChat(sessionId);
      }

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      console.log('Response received:', text);
      return text;
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error.message?.includes('initialize')) {
        throw error;
      }
      
      throw new Error(`Failed to send message: ${error.message}`);
    }
  },

  // Clear chat session
  clearChat(sessionId = 'default') {
    chatSessions.delete(sessionId);
  },

  // Generate content without chat context
  async generateContent(prompt) {
    try {
      if (!workingModel) {
        await this.initialize();
      }
      
      console.log('Generating content for prompt:', prompt);
      const result = await workingModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('Generated content:', text);
      return text;
    } catch (error) {
      console.error('Error generating content:', error);
      
      if (error.message?.includes('initialize')) {
        throw error;
      }
      
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }
};

// Auto-test on load
testConnection().then(result => {
  console.log('Gemini API Test Result:', result);
  if (!result.success) {
    console.error('⚠️ GEMINI API NOT WORKING:', result.message);
  }
});

export default geminiAPI;