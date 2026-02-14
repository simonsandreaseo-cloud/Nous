const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:11434');

ws.on('open', function open() {
    console.log('[TEST FLUX] Conectado');

    // 1. Autenticar
    ws.send(JSON.stringify({ type: 'AUTH', payload: { token: 'nous-dev-token-2026' } }));

    // 2. Probar Nexus (Crear Tarea)
    setTimeout(() => {
        console.log('[TEST FLUX] Creando tarea Nexus...');
        ws.send(JSON.stringify({
            type: 'FLUX_CREATE_TASK',
            payload: { title: 'Auditoría SEO: Example.com', category: 'Audit', priority: 'high' }
        }));
    }, 1000);

    // 3. Probar Chronos (Iniciar Timer)
    setTimeout(() => {
        console.log('[TEST FLUX] Iniciando Chronos Timer...');
        ws.send(JSON.stringify({
            type: 'FLUX_START_TIMER',
            payload: { taskId: 'dummy-id', description: 'Investigación de keywords' }
        }));
    }, 2000);

    // 4. Obtener Estadísticas
    setTimeout(() => {
        console.log('[TEST FLUX] Consultando estadísticas...');
        ws.send(JSON.stringify({ type: 'FLUX_GET_STATS' }));
    }, 3000);

    // 5. Detener Timer y Cerrar
    setTimeout(() => {
        console.log('[TEST FLUX] Deteniendo Timer...');
        ws.send(JSON.stringify({ type: 'FLUX_STOP_TIMER' }));
        setTimeout(() => {
            console.log('[TEST FLUX] Prueba completada.');
            ws.close();
            process.exit(0);
        }, 500);
    }, 4000);
});

ws.on('message', function incoming(data) {
    const msg = JSON.parse(data);
    console.log('[TEST FLUX] Recibido:', msg.type, JSON.stringify(msg.payload).substring(0, 100));
});

ws.on('error', (err) => console.error('[TEST FLUX] Error:', err.message));
