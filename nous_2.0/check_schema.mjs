
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTasksSchema() {
  console.log('Checking "tasks" table for columns...');
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .limit(1);

  if (error) {
    if (error.code === 'PGRST204') {
        console.log('Column not found error. Checking specific missing columns...');
        // We know h1, meta_description, seo_title, excerpt, slug are likely missing
    }
    console.error('Error fetching tasks sample:', error.message || error);
    return;
  }

  if (data) {
    if (data.length > 0) {
      console.log('Columns found in "tasks":', Object.keys(data[0]));
    } else {
        console.log('Table "tasks" is empty. Cannot determine columns via data keys.');
    }
  }
}

checkTasksSchema();
