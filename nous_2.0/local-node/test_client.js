const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:11434');

ws.on('open', function open() {
    console.log('[TEST] Conectado');

    // 1. Intentar enviar comando sin auth (debe fallar)
    ws.send(JSON.stringify({ type: 'PING' }));

    // 2. Autenticarse
    setTimeout(() => {
        console.log('[TEST] Enviando AUTH...');
        ws.send(JSON.stringify({ type: 'AUTH', payload: { token: 'nous-dev-token-2026' } }));
    }, 500);

    // 3. Enviar tarea tras autenticación
    setTimeout(() => {
        console.log('[TEST] Enviando tarea de prueba...');
        // Usamos un comando query simple para ver si el crawler arranca (aunque falle por falta de params reales)
        ws.send(JSON.stringify({ type: 'START_CRAWL', payload: { url: 'https://www.google.com/search?q=mejores+herramientas+seo+2024', mode: 'scrape' } }));
    }, 1000);
});

ws.on('message', function incoming(data) {
    const msg = JSON.parse(data);
    console.log('[TEST] Recibido:', msg.type, msg.payload || '');

    if (msg.type === 'CRAWL_COMPLETE' || msg.type === 'CRAWL_ERROR' || msg.type === 'TASK_COMPLETE') {
        console.log('[TEST] Ciclo completado. Cerrando.');
        ws.close();
        process.exit(0);
    }
});
