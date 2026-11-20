const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NTEwOTAsImV4cCI6MjA5NTMyNzA5MH0.7Triks6ZEfY3nqOqjwej_2ASy7rOqFKDDQew5bwxd2M';

async function rpcCall(functionName, params = {}) {
  const url = `${supabaseUrl}/rest/v1/rpc/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en Supabase RPC [${functionName}]: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function fetchProjects() {
  return await rpcCall('get_nous_projects');
}

async function fetchTasks(projectId = null, status = null) {
  return await rpcCall('get_nous_tasks', {
    p_project_id: projectId || null,
    p_status: status || null
  });
}

async function fetchTaskBody(taskId) {
  const rows = await rpcCall('get_nous_task_body', { p_task_id: taskId });
  return rows && rows.length > 0 ? rows[0] : null;
}

async function saveHumanizedTask(taskId, contentBody, aiPercentage = 5, status = 'por_revisar', metrics = {}) {
  return await rpcCall('update_nous_task_humanized', {
    p_task_id: taskId,
    p_content_body: contentBody,
    p_ai_percentage: aiPercentage,
    p_status: status,
    p_metrics: metrics
  });
}

module.exports = {
  fetchProjects,
  fetchTasks,
  fetchTaskBody,
  saveHumanizedTask
};
