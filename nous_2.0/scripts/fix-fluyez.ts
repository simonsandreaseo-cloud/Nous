import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProject() {
    console.log("Fixing proyecto Fluyez...");

    // We'll set the gsc_site_url to accurately match the domain for now
    // Most GSC properties are either sc-domain:domain or https://domain/

    const { data, error } = await supabase
        .from('projects')
        .update({
            gsc_site_url: 'sc-domain:fluyez.com',
            gsc_connected: true
        })
        .eq('domain', 'fluyez.com');

    if (error) console.error("Error updating project:", error);
    else console.log("Project updated successfully.");
}

fixProject();
