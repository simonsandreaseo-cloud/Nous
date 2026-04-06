import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function checkSchema() {
  const { data, error } = await supabase.from('content_drafts').select('*').limit(1);
  if (error) {
    console.error('Error fetching content_drafts:', error);
  } else {
    console.log('Sample content_draft:', data[0]);
  }
}

checkSchema();
