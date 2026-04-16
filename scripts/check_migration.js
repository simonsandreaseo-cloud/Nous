async function run() {
  const token = 'sbp_6d4e1d1d9112b9a362ae31e74dea999b3132f9ca';
  const projectRef = 'pugbtgqfxylmovcwvmbo';
  const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_competitors';`;

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const data = await response.json();
  console.log(data);
}

run();