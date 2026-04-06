// --- Export to Google Ecosystem ---

export async function exportToGoogleDoc(title: string, htmlContent: string, sessionToken: string): Promise<string> {
    try {
        const response = await fetch('/api/google/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify({ action: 'create_doc', title, content: htmlContent })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to export');
        return data.url;
    } catch (e) { throw e; }
}

export async function exportToGoogleSheet(title: string, data: any[][], sessionToken: string): Promise<string> {
    try {
        const response = await fetch('/api/google/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify({ action: 'create_sheet', title, data })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to export');
        return result.url;
    } catch (e) { throw e; }
}

export async function exportToGoogleSlides(title: string, slidesData: { title: string, content: string[] }[], sessionToken: string): Promise<string> {
    try {
        const response = await fetch('/api/google/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify({ action: 'create_slides', title, data: slidesData })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to export');
        return data.url;
    } catch (e) { throw e; }
}
