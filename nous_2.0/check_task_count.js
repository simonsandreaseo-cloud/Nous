const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { count: tasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
    const { count: contentTasksCount } = await supabase.from('content_tasks').select('*', { count: 'exact', head: true });
    
    console.log(`Tasks table rows: ${tasksCount}`);
    console.log(`Content_Tasks table rows: ${contentTasksCount}`);
}
check();
