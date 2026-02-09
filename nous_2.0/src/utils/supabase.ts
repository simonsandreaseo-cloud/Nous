
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Ensure these environment variables are set before creating the client
if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key is missing. Check your .env setup or Vercel Environment Variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
