const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://wswylghsczgusgagucbd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NTEwOTAsImV4cCI6MjA5NTMyNzA5MH0.7Triks6ZEfY3nqOqjwej_2ASy7rOqFKDDQew5bwxd2M';

async function fetchOriginalDraft() {
  // Use RPC get_nous_task_body
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_nous_task_body`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_task_id: 'ed810b7f-5e21-44b3-bad3-c88020526a0f' })
  });

  const body = await res.text();
  fs.writeFileSync(path.join(__dirname, 'original_target_draft.html'), body, 'utf8');
  console.log('Saved original target draft, length:', body.length);
}

fetchOriginalDraft().catch(console.error);
