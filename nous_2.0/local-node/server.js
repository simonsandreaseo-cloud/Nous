const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const flux = require('./fluxEngine');
const ai = require('./ai'); // Importar IA Local



// Pseudo-auth stores (In a real app, these would come from securely stored credentials)



const WSS_PORT = 11434;
const ALLOWED_ORIGINS = ['tauri://localhost', 'http://localhost:3000', 'http://127.0.0.1:3000'];

// Token fijo para desarrollo (Phase 1)
const SESSION_TOKEN = "nous-dev-token-2026";
console.log(`[NOUS NODE] Servidor iniciado.`);
console.log(`[NOUS NODE] Token de sesión esperado: ${SESSION_TOKEN}`);
console.log(`[NOUS NODE] Esperando conexiones en ws://localhost:${WSS_PORT}`);

// Iniciar IA asíncronamente (descargará modelo si no existe)
ai.initAI().catch(e => console.error("[NOUS NODE] Error inicializando IA:", e));


const wss = new WebSocket.Server({
    port: WSS_PORT,
    verifyClient: (info, cb) => {
        const origin = info.req.headers.origin;
        // Permitir si no hay origen (local tools) o si está en la lista blanca
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            cb(true);
        } else {
            console.warn(`[NOUS NODE] Conexión rechazada desde origen no permitido: ${origin}`);
            cb(false, 403, 'Forbidden Origin');
        }
    }
});

// Estado global del nodo
let nodeState = {
    status: 'IDLE',
    activeProcess: null,
    queue: [], // Cola de tareas: { type, payload, id }
    lastError: null,
    authenticatedClients: new Set() // Set de WebSockets autenticados
};

// Broadcast a todos los clientes AUTENTICADOS
function broadcastList(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN && nodeState.authenticatedClients.has(client)) {
            client.send(JSON.stringify(data));
        }
    });
}

function broadcastFluxStats() {
    broadcastList({ type: 'FLUX_STATS', payload: flux.getStats() });
}

function broadcastState(override = {}) {
    // No enviar activeProcess object circular, solo info
    const safeState = {
        status: nodeState.status,
        queueLength: nodeState.queue.length,
        lastError: nodeState.lastError,
        ...override
    };
    const payload = { type: 'STATE_UPDATE', payload: safeState };
    broadcastList(payload);
}

wss.on('connection', function connection(ws) {
    console.log('[NOUS NODE] Nuevo cliente conectado. Esperando autenticación...');

    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);

    ws.on('message', function incoming(message) {
        try {
            const data = JSON.parse(message);

            // --- Handshake de Autenticación ---
            if (data.type === 'AUTH') {
                if (data.payload.token === SESSION_TOKEN) {
                    nodeState.authenticatedClients.add(ws);
                    ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', payload: { status: 'OK' } }));
                    console.log('[NOUS NODE] Cliente autenticado correctamente');
                    // Enviar estado inicial
                    ws.send(JSON.stringify({
                        type: 'STATE_UPDATE', payload: {
                            status: nodeState.status,
                            queueLength: nodeState.queue.length
                        }
                    }));
                } else {
                    ws.send(JSON.stringify({ type: 'AUTH_ERROR', payload: { message: 'Invalid Token' } }));
                    console.warn('[NOUS NODE] Intento de autenticación fallido (Token inválido)');
                }
                return;
            }

            // --- Verificar Autenticación para otros comandos ---
            if (!nodeState.authenticatedClients.has(ws)) {
                ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Unauthorized: Please send AUTH first' } }));
                return;
            }

            console.log(`[NOUS NODE] Recibido comando autenticado: ${data.type}`);

            switch (data.type) {
                case 'PING':
                    ws.send(JSON.stringify({ type: 'PONG', payload: { timestamp: Date.now() } }));
                    break;

                case 'START_CRAWL':
                    addToQueue('CRAWL', data.payload);
                    break;

                case 'START_REFINERY':
                    addToQueue('REFINERY', data.payload);
                    break;

                // --- NOUS FLUX (Chronos + Nexus) ---
                case 'FLUX_CREATE_TASK':
                    const newTask = flux.createTask(data.payload.title, data.payload.category, data.payload.priority);
                    ws.send(JSON.stringify({ type: 'FLUX_TASK_CREATED', payload: newTask }));
                    broadcastFluxStats();
                    break;

                case 'FLUX_GET_TASKS':
                    ws.send(JSON.stringify({ type: 'FLUX_TASKS_LIST', payload: flux.getTasks() }));
                    break;

                case 'FLUX_START_TIMER':
                    const entry = flux.startTimer(data.payload.taskId, data.payload.description);
                    ws.send(JSON.stringify({ type: 'FLUX_TIMER_STARTED', payload: entry }));
                    broadcastFluxStats();
                    break;

                case 'FLUX_STOP_TIMER':
                    const stopped = flux.stopActiveTimer();
                    ws.send(JSON.stringify({ type: 'FLUX_TIMER_STOPPED', payload: stopped }));
                    broadcastFluxStats();
                    break;

                case 'FLUX_GET_STATS':
                    ws.send(JSON.stringify({ type: 'FLUX_STATS', payload: flux.getStats() }));
                    break;

                // --- IA LOCAL (Gemma 3 4B) ---
                case 'AI_GET_STATUS':
                    ws.send(JSON.stringify({ type: 'AI_STATUS', payload: ai.getStatus() }));
                    break;

                case 'AI_PROMPT':
                    const promptText = data.payload.text;
                    const promptId = data.payload.id || crypto.randomUUID();
                    ws.send(JSON.stringify({ type: 'AI_RESPONSE_START', payload: { id: promptId } }));
                    
                    ai.promptAI(promptText, (chunk) => {
                        // Enviar cada chunk del texto generado en tiempo real
                        ws.send(JSON.stringify({ type: 'AI_RESPONSE_CHUNK', payload: { id: promptId, textChunk: chunk } }));
                    }).then((finalText) => {
                        ws.send(JSON.stringify({ type: 'AI_RESPONSE_COMPLETE', payload: { id: promptId, fullText: finalText } }));
                    }).catch((err) => {
                        console.error("[NOUS NODE] Error en prompt IA:", err);
                        ws.send(JSON.stringify({ type: 'AI_ERROR', payload: { id: promptId, message: err.message } }));
                    });
                    break;

                default:
                    console.warn('[NOUS NODE] Comanda desconocida:', data.type);
            }
        } catch (e) {
            console.error('[NOUS NODE] Error procesando mensaje:', e);
        }
    });

    ws.on('close', () => {
        nodeState.authenticatedClients.delete(ws);
    });
});

// --- Queue Manager ---

function addToQueue(type, payload) {
    const taskId = crypto.randomUUID();
    nodeState.queue.push({ id: taskId, type, payload });
    console.log(`[NOUS NODE] Tarea encolada: ${type} (ID: ${taskId})`);

    // Notificar cambio de estado (cola creció)
    broadcastState();

    // Intentar procesar
    processQueue();
}

function processQueue() {
    // Si ya estamos haciendo algo o la cola está vacía, salir
    if (nodeState.status !== 'IDLE' || nodeState.queue.length === 0) {
        return;
    }

    const task = nodeState.queue.shift(); // FIFO
    console.log(`[NOUS NODE] Iniciando procesamiento de tarea: ${task.type} (${task.id})`);

    // Notificar que se sacó de la cola
    broadcastState();

    if (task.type === 'CRAWL') {
        runTaskScript('crawler.js', 'CRAWLING', task.payload);
    } else if (task.type === 'REFINERY') {
        runTaskScript('refinery.js', 'PROCESSING', task.payload);
    }
}

function runTaskScript(scriptName, status, options) {
    nodeState.status = status;
    broadcastState();

    const scriptPath = path.join(__dirname, scriptName);

    // Verificar si el script existe antes de ejecutar
    if (!fs.existsSync(scriptPath)) {
        console.error(`[NOUS NODE] Script no encontrado: ${scriptPath}`);
        nodeState.status = 'ERROR';
        nodeState.lastError = `Script ${scriptName} not found`;
        broadcastState();

        // Volver a IDLE tras un breve delay para permitir que el error se vea
        setTimeout(() => {
            nodeState.status = 'IDLE';
            nodeState.lastError = null;
            broadcastState();
            processQueue();
        }, 2000);
        return;
    }

    const child = spawn('node', [scriptPath, JSON.stringify(options)]);
    nodeState.activeProcess = child;

    child.stdout.on('data', (data) => {
        const output = data.toString();
        // console.log(`[${scriptName} STDOUT]: ${output}`);
        broadcastList({ type: 'LOG', payload: { source: scriptName, message: output } });
    });

    child.stderr.on('data', (data) => {
        const output = data.toString();
        console.error(`[${scriptName} STDERR]: ${output}`);
        broadcastList({ type: 'LOG', payload: { source: scriptName, level: 'error', message: output } });
    });

    child.on('close', (code) => {
        console.log(`[${scriptName}] Terminado. Código: ${code}`);
        nodeState.status = 'IDLE';
        nodeState.activeProcess = null;

        broadcastList({ type: 'TASK_COMPLETE', payload: { script: scriptName, code } });
        broadcastState();

        // Procesar siguiente en cola
        setTimeout(processQueue, 100);
    });
}

// Heartbeat para mantener conexiones vivas y limpiar zombies
const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', function close() {
    clearInterval(interval);
});
