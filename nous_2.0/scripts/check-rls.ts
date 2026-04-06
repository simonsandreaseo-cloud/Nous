import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

async function checkRLS() {
    console.log("Checking projects as anonymous user (should be 0 if RLS is on):");
    const { data, count, error } = await supabase.from('projects').select('*', { count: 'exact' });
    console.log("Count:", count);
    if (error) console.error("Error:", error);

    console.log("\nRLS Policies Check (SQL):");
    // We can't query pg_policies easily without admin SQL access, but we already have an idea.
}

checkRLS();
