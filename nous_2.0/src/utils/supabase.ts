
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
        console.warn('⚠️ Supabase URL or Key is missing in build environment.');
    }
}

// Check for empty strings to avoid createClient throwing an error during build
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : ({} as any); // Fallback for build phase

