
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
console.log('NEXT_PUBLIC_GROQ_API_KEY:', !!process.env.NEXT_PUBLIC_GROQ_API_KEY);
console.log('GROQ_API_KEYS:', !!process.env.GROQ_API_KEYS);
console.log('NEXT_PUBLIC_GEMINI_API_KEY:', !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);
console.log('GOOGLE_GENERATIVE_AI_API_KEY:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
console.log('GEMINI_API_KEYS:', !!process.env.GEMINI_API_KEYS);
console.log('CEREBRAS_API_KEY:', !!process.env.CEREBRAS_API_KEY);
console.log('OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY);
