import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- Supabase Diagnostic ---");
    console.log(`URL: ${supabaseUrl}`);

    // 1. Check Projects
    console.log("\n1. Projects Table:");
    const { data: projects, error: pError } = await supabase.from('projects').select('*');
    if (pError) console.error("Error fetching projects:", pError);
    else {
        console.table(projects?.map(p => ({
            id: p.id,
            domain: p.domain,
            user_id: p.user_id,
            gsc_connected: p.gsc_connected,
            gsc_site_url: p.gsc_site_url
        })));
    }

    // 2. Check User Tokens
    console.log("\n2. User GSC Tokens Table:");
    const { data: tokens, error: tError } = await supabase.from('user_gsc_tokens').select('*');
    if (tError) console.error("Error fetching tokens:", tError);
    else {
        console.table(tokens?.map(t => ({
            user_id: t.user_id,
            has_refresh: !!t.refresh_token,
            updated_at: t.updated_at
        })));
    }

    // 3. Check Current User (Auth)
    console.log("\n3. Auth Users (Public view):");
    // We can't easily list auth.users from client even with service_role without using admin API
    const { data: users, error: uError } = await supabase.auth.admin.listUsers();
    if (uError) console.error("Error listing users:", uError);
    else {
        console.log(`Total Auth Users: ${users.users.length}`);
        users.users.forEach(u => console.log(`- ${u.id} (${u.email})`));
    }
}

diagnose();
