import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@tauri-apps/api/core';

export const LocalNodeBridge = {
    /**
     * Checks if the app is running within a Tauri environment.
     */
    isAvailable(): boolean {
        try {
            return isTauri();
        } catch {
            return false;
        }
    },

    /**
     * Sends a ping to the local node to verify connection.
     */
    async ping(): Promise<string> {
        if (!this.isAvailable()) return 'Web Mode (No Local Node)';
        try {
            return await invoke('ping_node');
        } catch (e) {
            console.error('Local Node Error:', e);
            return 'Offline';
        }
    },

    /**
     * Execute a local shell command (e.g., python, scraping script).
     * Requires proper permissions in tauri.conf.json
     */
    async executeCommand(program: string, args: string[]): Promise<any> {
        if (!this.isAvailable()) throw new Error('Local Node not available');
        // This will use the shell plugin
        const { Command } = await import('@tauri-apps/plugin-shell');
        const command = Command.create(program, args);
        const output = await command.execute();
        return output;
    },

    /**
     * Specialized method to run the deep crawler.
     */
    async crawl(options: { keyword?: string, url?: string, mode: 'search' | 'scrape' }): Promise<any> {
        if (!this.isAvailable()) throw new Error('Local Node not available');

        // Path to the crawler script (assuming relative to the app execution base or absolute)
        // In dev, absolute path to local-node/crawler.js is safest
        // In production, this would be a sidecar.
        const scriptPath = 'local-node/crawler.js';

        const { Command } = await import('@tauri-apps/plugin-shell');

        // We call 'node' and pass the script + JSON payload
        const command = Command.create('node', [
            scriptPath,
            JSON.stringify(options)
        ]);

        const output = await command.execute();

        if (output.code !== 0) {
            throw new Error(`Crawler failed with code ${output.code}: ${output.stderr}`);
        }

        try {
            return JSON.parse(output.stdout);
        } catch (e) {
            throw new Error(`Failed to parse crawler output: ${output.stdout}`);
        }
    },

    /**
     * Refine a local CSV file using the Data Refinery engine.
     */
    async refineData(filePath: string): Promise<any> {
        if (!this.isAvailable()) throw new Error('Local Node not available');

        const scriptPath = 'local-node/refinery.js';
        const { Command } = await import('@tauri-apps/plugin-shell');

        const command = Command.create('node', [
            scriptPath,
            JSON.stringify({ filePath })
        ]);

        const output = await command.execute();

        if (output.code !== 0) {
            throw new Error(`Refinery failed: ${output.stderr}`);
        }

        try {
            return JSON.parse(output.stdout);
        } catch (e) {
            throw new Error(`Failed to parse refinery output: ${output.stdout}`);
        }
    }
};
