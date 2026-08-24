export async function streamGenerate(
    prompt: string,
    model: string,
    hierarchy: string[] | undefined,
    onChunk: (html: string) => void,
    onStatus: (msg: string) => void,
    provider?: string,
    reasoning?: string
): Promise<{ html: string; usage?: any }> {
    const response = await fetch('/api/writer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, hierarchy, provider, reasoning })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    if (!response.body) throw new Error("No se pudo iniciar el stream del servidor.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalHtml = '';
    let finalUsage = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'error') throw new Error(parsed.error);
                if (parsed.type === 'status') onStatus(parsed.message);
                if (parsed.type === 'chunk') {
                    finalHtml += parsed.html;
                    onChunk(finalHtml);
                }
                if (parsed.type === 'done') {
                    finalHtml = parsed.text || finalHtml;
                    if (parsed.usage) finalUsage = parsed.usage;
                }
            } catch (e: any) {
                if (e.message !== "Unexpected end of JSON input" && !e.message.includes('JSON')) {
                    throw e; 
                }
            }
        }
    }
    
    if (!finalHtml) throw new Error("No se generó contenido válido.");
    return { html: finalHtml, usage: finalUsage };
}

export async function streamHumanize(
    content: string,
    config: any,
    intensity: number,
    onChunk: (html: string) => void,
    onStatus: (msg: string) => void,
    model?: string,
    onProgress?: (percent: number) => void,
    provider?: string,
    reasoning?: string
): Promise<{ html: string; result?: any }> {
    const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, config, intensity, model, provider, reasoning })
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
        if (response.status === 504) {
            throw new Error("El servidor tardó demasiado en responder (Error 504: Timeout).");
        }
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } else {
            throw new Error(`Error del servidor (${response.status}): La respuesta no es JSON válido.`);
        }
    }

    if (!response.body) throw new Error("No se pudo iniciar el stream del servidor.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let newContent = '';
    let finalResult = null;
    let finalUsage = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'status') {
                    onStatus(parsed.message);
                } else if (parsed.type === 'chunk') {
                    // El API ahora puede enviar chunks de todo el HTML reconstruido 
                    // No concatenar, simplemente reemplazar para mostrar el progreso!
                    // Wait, runHumanizerPipeline passes the whole HTML?
                    // YES! `onChunk(tmp.html())` in aiActions sends the *entire* HTML so far.
                    // Oh, wait. In runHumanizerPipeline:
                    // `onChunk(tmp.html());` inside the loop.
                    // If we do `newContent += parsed.html`, it will duplicate!
                    // Let's replace the whole `newContent` with `parsed.html`?
                    // Actually, the original implementation was `newContent += parsed.html + '\n';`.
                    // But in original aiActions.ts it called `onChunk(finalHtml)` only once at the end!
                    // Now it calls it multiple times with the FULL HTML updated so far.
                    // Therefore we MUST NOT append! We must REPLACE!
                    newContent = parsed.html;
                    onChunk(newContent);
                } else if (parsed.type === 'progress') {
                    if (onProgress) onProgress(parsed.percent);
                } else if (parsed.type === 'error') {
                    throw new Error(parsed.error);
                } else if (parsed.type === 'done') {
                    finalResult = parsed.result; if(parsed.usage && finalResult) finalResult.usage = parsed.usage;
                    if (parsed.usage) finalUsage = parsed.usage;
                }
            } catch (e: any) {
                if (e.message !== "Unexpected end of JSON input" && !e.message.includes('JSON')) {
                    throw e;
                }
            }
        }
    }

    if (!finalResult) {
        finalResult = { html: newContent };
    }
    return { html: finalResult.html || newContent, result: finalResult, usage: finalUsage };
}

export async function streamMiniHumanize(
    content: string,
    config: any,
    intensity: number,
    onChunk: (html: string) => void,
    onStatus: (msg: string) => void, model?: string, mode?: string, provider?: string, reasoning?: string
): Promise<{ html: string; result?: any }> {
    const response = await fetch('/api/mini-humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, config, intensity, model, mode, provider, reasoning })
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
        if (response.status === 504) {
            throw new Error("El servidor tardó demasiado en responder (Error 504: Timeout).");
        }
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } else {
            throw new Error(`Error del servidor (${response.status}): La respuesta no es JSON válido.`);
        }
    }

    if (!response.body) throw new Error("No se pudo iniciar el stream del servidor.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let newContent = '';
    let finalResult = null;
    let finalUsage = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'status') {
                    onStatus(parsed.message);
                } else if (parsed.type === 'log') {
                    console.log('%c[MiniHumanizer]', 'color: #f59e0b; font-weight: bold;', parsed.message);
                } else if (parsed.type === 'chunk') {
                    newContent += parsed.html + '\n';
                    onChunk(newContent);
                } else if (parsed.type === 'error') {
                    throw new Error(parsed.error);
                } else if (parsed.type === 'done') {
                    finalResult = parsed.result; if(parsed.usage && finalResult) finalResult.usage = parsed.usage;
                    if (parsed.usage) finalUsage = parsed.usage;
                }
            } catch (e: any) {
                if (e.message !== "Unexpected end of JSON input" && !e.message.includes('JSON')) {
                    throw e;
                }
            }
        }
    }

    if (!finalResult) {
        finalResult = { html: newContent };
    }
    return { html: finalResult.html || newContent, result: finalResult, usage: finalUsage };
}


export async function streamSEOPostProcess(
    html: string,
    config: any,
    onStatus: (msg: string) => void
): Promise<{ html: string; usage?: any }> {
    let refinedSEO = html; let finalUsage = null;
    const response = await fetch('/api/writer/seo-postprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, config })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.type === 'error') throw new Error(parsed.error);
                    if (parsed.type === 'status') onStatus(parsed.message);
                    if (parsed.type === 'done') { refinedSEO = parsed.text; if (parsed.usage) finalUsage = parsed.usage; }
                } catch (e: any) {
                    if (e.message !== "Unexpected end of JSON input" && !e.message.includes('JSON')) {
                        throw e;
                    }
                }
            }
        }
    }
    return { html: refinedSEO, usage: finalUsage };
}

export async function streamFinalCleanup(
    html: string,
    onStatus: (msg: string) => void
): Promise<{ html: string; usage?: any }> {
    let cleanedHtml = html;
    const response = await fetch('/api/writer/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalUsage = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.type === 'error') throw new Error(parsed.error);
                    if (parsed.type === 'status') onStatus(parsed.message);
                    if (parsed.type === 'done') {
                        cleanedHtml = parsed.text;
                        if (parsed.usage) finalUsage = parsed.usage;
                    }
                } catch (e: any) {
                    if (e.message !== "Unexpected end of JSON input" && !e.message.includes('JSON')) {
                        throw e;
                    }
                }
            }
        }
        return { html: cleanedHtml, usage: finalUsage };
    }
    return { html: cleanedHtml };
}

export async function streamSurgicalEdit(
    content: string,
    config: any,
    intensity: number,
    onChunk: (html: string) => void,
    onStatus: (msg: string) => void, model?: string, provider?: string, reasoning?: string): Promise<{ html: string; result?: any }> {
    const response = await fetch('/api/surgical-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, config, intensity, model })
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
        if (response.status === 504) {
            throw new Error("El servidor tardó demasiado en responder (Error 504: Timeout).");
        }
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } else {
            throw new Error(`Error del servidor (${response.status}): La respuesta no es JSON válido.`);
        }
    }

    if (!response.body) throw new Error("No se pudo iniciar el stream del servidor.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let newContent = '';
    let finalResult = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'status') {
                    onStatus(parsed.message);
                } else if (parsed.type === 'chunk') {
                    newContent = parsed.html;
                    onChunk(newContent);
                } else if (parsed.type === 'done') {
                    finalResult = parsed.result; if(parsed.usage && finalResult) finalResult.usage = parsed.usage;
                    if (finalResult && finalResult.html) {
                        newContent = finalResult.html;
                    }
                } else if (parsed.type === 'error') {
                    throw new Error(parsed.error);
                }
            } catch (e: any) {
                if (e.message !== "Unexpected end of JSON input" && !e.message.includes('JSON')) {
                    throw e;
                }
            }
        }
    }

    if (!finalResult) {
        throw new Error("El servidor terminó la conexión sin enviar el resultado final.");
    }

    return finalResult;
}

export async function streamCustomTransform(
    content: string,
    presetInstructions: string,
    userInstructions: string,
    onChunk: (html: string) => void,
    onStatus: (msg: string) => void, model?: string, provider?: string, reasoning?: string
): Promise<{ html: string; result?: any }> {
    const response = await fetch('/api/custom-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, presetInstructions, userInstructions, model, provider, reasoning })
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
        if (response.status === 504) {
            throw new Error("El servidor tardó demasiado en responder (Error 504: Timeout).");
        }
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } else {
            throw new Error(`Error del servidor (${response.status}): La respuesta no es JSON válido.`);
        }
    }

    if (!response.body) throw new Error("No se pudo iniciar el stream del servidor.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let newContent = '';
    let finalResult = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'status') {
                    onStatus(parsed.message);
                } else if (parsed.type === 'chunk') {
                    newContent = parsed.html;
                    onChunk(newContent);
                } else if (parsed.type === 'done') {
                    finalResult = parsed.result; if(parsed.usage && finalResult) finalResult.usage = parsed.usage;
                    if (finalResult && finalResult.html) {
                        newContent = finalResult.html;
                    }
                } else if (parsed.type === 'error') {
                    throw new Error(parsed.error);
                }
            } catch (e: any) {
                if (e.message !== "Unexpected end of JSON input" && !e.message.includes('JSON')) {
                    throw e;
                }
            }
        }
    }

    if (!finalResult) {
        throw new Error("El servidor terminó la conexión sin enviar el resultado final.");
    }

    return finalResult;
}

export async function fetchCustomTransformPlan(
    chunks: string[],
    presetInstructions: string,
    userInstructions: string,
    model?: string,
    provider?: string
): Promise<{ stylesheet: string; plan: { index: number; focus: string; pautasEspecificas: string }[] }> {
    const response = await fetch('/api/custom-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'plan',
            chunks,
            presetInstructions,
            userInstructions,
            model,
            provider
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error obteniendo plan del diseñador (${response.status})`);
    }

    return response.json();
}

export async function streamCustomTransformChunk(
    chunk: string,
    stylesheet: string,
    pautasEspecificas: string,
    onChunk: (html: string) => void,
    onStatus: (msg: string) => void,
    model?: string,
    provider?: string
): Promise<{ html: string }> {
    const response = await fetch('/api/custom-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'process-chunk',
            chunk,
            stylesheet,
            pautasEspecificas,
            model,
            provider
        })
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
        if (response.status === 504) {
            throw new Error("El servidor tardó demasiado en responder (Timeout).");
        }
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } else {
            throw new Error(`Error del servidor (${response.status}): La respuesta no es JSON válido.`);
        }
    }

    if (!response.body) throw new Error("No se pudo iniciar el stream del servidor.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let newContent = '';
    let finalResult = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'status') {
                    onStatus(parsed.message);
                } else if (parsed.type === 'chunk') {
                    newContent = parsed.html;
                    onChunk(newContent);
                } else if (parsed.type === 'done') {
                    finalResult = parsed.result; if(parsed.usage) finalResult.usage = parsed.usage;
                    if (finalResult && finalResult.html) {
                        newContent = finalResult.html;
                    }
                } else if (parsed.type === 'error') {
                    throw new Error(parsed.error);
                }
            } catch (e: any) {
                if (e.message !== "Unexpected end of JSON input" && !e.message.includes('JSON')) {
                    throw e;
                }
            }
        }
    }

    if (!finalResult) {
        throw new Error("El servidor terminó la conexión sin enviar el resultado final.");
    }

    return finalResult;
}
