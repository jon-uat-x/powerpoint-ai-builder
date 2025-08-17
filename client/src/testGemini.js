// Direct test of Gemini API
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyAIaoyackjLgToGh_okfAoyjuqkwyl1KF0';

async function testGeminiAPI() {
  console.log('Testing Gemini API with key:', API_KEY.substring(0, 10) + '...');
  
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  // Test different model names
  const modelsToTest = [
    'gemini-2.5-flash',  // Gemini Flash 2.5
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'models/gemini-2.5-flash',
    'models/gemini-1.5-flash'
  ];
  
  for (const modelName of modelsToTest) {
    console.log(`\nTrying model: ${modelName}`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      const text = response.text();
      console.log(`✅ SUCCESS with ${modelName}:`, text);
      return { success: true, model: modelName, response: text };
    } catch (error) {
      console.log(`❌ Failed with ${modelName}:`, error.message);
      if (error.message.includes('API key not valid')) {
        console.error('API KEY ISSUE:', error.message);
        break;
      }
    }
  }
  
  return { success: false, error: 'No models worked' };
}

// Run the test
testGeminiAPI().then(result => {
  console.log('Final result:', result);
}).catch(err => {
  console.error('Test failed:', err);
});

export default testGeminiAPI;