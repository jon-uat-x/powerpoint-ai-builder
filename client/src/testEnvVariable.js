// Test file to verify environment variable is loaded
console.log('Environment check:');
console.log('VITE_GEMINI_API_KEY is set:', !!import.meta.env.VITE_GEMINI_API_KEY);
console.log('VITE_SUPABASE_URL is set:', !!import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY is set:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

if (import.meta.env.VITE_GEMINI_API_KEY) {
  console.log('API Key preview:', import.meta.env.VITE_GEMINI_API_KEY.substring(0, 10) + '...');
} else {
  console.error('VITE_GEMINI_API_KEY is not set!');
}

export default function checkEnv() {
  return {
    geminiKeySet: !!import.meta.env.VITE_GEMINI_API_KEY,
    supabaseUrlSet: !!import.meta.env.VITE_SUPABASE_URL,
    supabaseKeySet: !!import.meta.env.VITE_SUPABASE_ANON_KEY
  };
}