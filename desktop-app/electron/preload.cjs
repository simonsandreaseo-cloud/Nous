const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // New Neurosymbolic Engine
  humanizeNeurosymbolic: (inputText, options) => ipcRenderer.invoke('humanize-neurosymbolic', inputText, options),
  humanizeWithJulian: (inputText, options) => ipcRenderer.invoke('humanize-neurosymbolic', inputText, options), // compat alias
  scanMetrics: (text) => ipcRenderer.invoke('scan-metrics', text),
  getPersonas: () => ipcRenderer.invoke('get-personas'),
  getDomainPacks: () => ipcRenderer.invoke('get-domain-packs'),
  
  // Local LLM (Ollama) Methods
  ollamaStatus: () => ipcRenderer.invoke('ollama-status'),
  ollamaModels: () => ipcRenderer.invoke('ollama-models'),
  ollamaPull: (modelName) => ipcRenderer.invoke('ollama-pull', modelName),

  // Agentic Workflow Methods
  startAgentWorkflow: (inputText) => ipcRenderer.invoke('start-agent-workflow', inputText),
  pauseAgentWorkflow: () => ipcRenderer.invoke('pause-agent-workflow'),
  resumeAgentWorkflow: () => ipcRenderer.invoke('resume-agent-workflow'),
  stopAgentWorkflow: () => ipcRenderer.invoke('stop-agent-workflow'),
  
  // Logs & Diagnostics Methods
  getRecentLogs: () => ipcRenderer.invoke('get-recent-logs'),
  clearRuntimeLogs: () => ipcRenderer.invoke('clear-runtime-logs'),
  openLogFolder: () => ipcRenderer.invoke('open-log-folder'),

  // Bank Coverage, Cross-Article Rotation & Gap Tracker Methods
  getBankStats: () => ipcRenderer.invoke('get-bank-stats'),
  reloadBank: () => ipcRenderer.invoke('reload-bank'),
  getDonorUsage: () => ipcRenderer.invoke('get-donor-usage'),
  resetDonorUsage: () => ipcRenderer.invoke('reset-donor-usage'),
  getBankGaps: () => ipcRenderer.invoke('get-bank-gaps'),
  updateBankGapStatus: (gapId, status) => ipcRenderer.invoke('update-bank-gap-status', gapId, status),
  clearResolvedBankGaps: () => ipcRenderer.invoke('clear-resolved-bank-gaps'),
  exportBankGapsBrief: (maxGaps) => ipcRenderer.invoke('export-bank-gaps-brief', maxGaps),
  openBankGapsFile: () => ipcRenderer.invoke('open-bank-gaps-file'),

  // Supabase Nous Cloud Methods
  supabaseGetProjects: () => ipcRenderer.invoke('supabase-get-projects'),
  supabaseGetTasks: (projectId, status) => ipcRenderer.invoke('supabase-get-tasks', projectId, status),
  supabaseGetTaskBody: (taskId) => ipcRenderer.invoke('supabase-get-task-body', taskId),
  supabaseSaveTask: (data) => ipcRenderer.invoke('supabase-save-task', data),

  // Event listener for real-time task chaining, thought streams, tool calls and supervisor audits
  onAgentEvent: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('agent-event', subscription);
    return () => ipcRenderer.removeListener('agent-event', subscription);
  }
});
