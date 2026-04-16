import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase
        .from('tasks')
        .select('id, title, research_dossier')
        .not('research_dossier->outline_structure', 'is', 'null')
        .order('id', { ascending: false })
        .limit(1);
    
    if (error) {
        console.error("Error:", error);
        return;
    }
    
    if (data && data.length > 0) {
        const dossier = data[0].research_dossier;
        console.log("=== Outline Structure for:", data[0].title, "===");
        console.log(JSON.stringify(dossier.outline_structure, null, 2));
    } else {
        console.log("No outlines found.");
    }
}

check();
