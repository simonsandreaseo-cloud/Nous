
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const varsToCheck = [
    'NEXT_PUBLIC_GROQ_API_KEY', 'GROQ_API_KEY', 
    'NEXT_PUBLIC_GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY',
    'OPENROUTER_API_KEY', 'NEXT_PUBLIC_OPENROUTER_API_KEY',
    'CEREBRAS_API_KEY', 'NEXT_PUBLIC_CEREBRAS_API_KEY'
];

varsToCheck.forEach(v => {
    console.log(`${v}: ${process.env[v] ? 'SET' : 'NOT SET'}`);
});
